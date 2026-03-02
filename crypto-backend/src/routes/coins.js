const express = require("express");
const axios = require("axios");
const authMiddleware = require("../../middleware/authMiddleware");
const { coinsCache, chartCache } = require("../services/cacheService");

const router = express.Router();


/* Listing API */
router.get("/api/listings", async (req, res) => {
    try {
        const cacheKey = "listings:raw";
        const cached = coinsCache.get(cacheKey);
        if (cached) {
            res.set("X-Cache", "HIT");
            return res.json(cached);
        }

        const response = await axios.get(
            "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest",
            {
                headers: {
                    "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY,
                    Accept: "application/json"
                },
                params: {
                    start: 1,
                    limit: 100,
                    sort: "market_cap",
                    cryptocurrency_type: "all",
                    tag: "all"
                }
            }
        );

        coinsCache.set(cacheKey, response.data, 30 * 1000);
        res.set("X-Cache", "MISS");
        res.json(response.data);
    } catch (err) {
        res.status(500).json({
            error: "Failed to fetch listings",
            message: err.message
        });
    }
});

/* Info API */
router.get("/info/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `info:${id}`;
        const cached = coinsCache.get(cacheKey);
        if (cached) {
            res.set("X-Cache", "HIT");
            return res.json(cached);
        }

        const response = await axios.get(
            "https://pro-api.coinmarketcap.com/v2/cryptocurrency/info",
            {
                headers: {
                    "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY,
                    Accept: "application/json"
                },
                params: { id }
            }
        );

        coinsCache.set(cacheKey, response.data, 60 * 1000); // 1 minute
        res.set("X-Cache", "MISS");
        res.json(response.data);
    } catch (err) {
        res.status(500).json({
            error: "Failed to fetch coin info",
            message: err.message
        });
    }
});

/* Merged API */
router.get("/listings-with-info", authMiddleware, async (req, res) => {
    try {
        const filter = req.query.filter || "all";
        const sort = req.query.sort || "market_cap";
        const order = req.query.order || "desc";

        // Cache the base (unfiltered) merged data
        const baseCacheKey = "listings-with-info:base";
        let merged = coinsCache.get(baseCacheKey);

        if (merged) {
            res.set("X-Cache", "HIT");
        } else {
            res.set("X-Cache", "MISS");

            const listingsRes = await axios.get(
                "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest",
                {
                    headers: {
                        "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY,
                        Accept: "application/json"
                    },
                    params: {
                        start: 1,
                        limit: 50,
                        sort,
                        sort_dir: order
                    }
                }
            );

            const ids = listingsRes.data.data.map(c => c.id).join(",");

            const infoRes = await axios.get(
                "https://pro-api.coinmarketcap.com/v2/cryptocurrency/info",
                {
                    headers: {
                        "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY,
                        Accept: "application/json"
                    },
                    params: { id: ids }
                }
            );

            const infoMap = infoRes.data.data;

            merged = listingsRes.data.data.map(coin => ({
                id: coin.id,
                name: coin.name,
                symbol: coin.symbol,
                price: coin.quote.USD.price,
                percent_change_24h: coin.quote.USD.percent_change_24h,
                market_cap: coin.quote.USD.market_cap,
                volume_24h: coin.quote.USD.volume_24h,
                logo: infoMap[coin.id]?.logo || null,
                tags: coin.tags || []
            }));

            // Store the unfiltered base data
            coinsCache.set(baseCacheKey, merged, 30 * 1000);
        }

        // Apply filters on a copy of the cached base data
        let data = [...merged];

        if (filter === "stable") {
            data = data.filter(c =>
                ["USDT", "USDC", "DAI", "BUSD"].includes(c.symbol)
            );
        }

        if (filter === "layer1") {
            data = data.filter(c =>
                ["BTC", "ETH", "SOL", "ADA", "AVAX", "DOT"].includes(c.symbol)
            );
        }

        if (filter === "alt") {
            data = data.filter(c =>
                c.symbol !== "BTC" && c.symbol !== "ETH"
            );
        }

        if (sort && sort !== "rank") {
            data.sort((a, b) => {
                if (order === "asc") return a[sort] - b[sort];
                return b[sort] - a[sort];
            });
        }

        // Set Cache-Control for browsers  
        res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
        res.json(data);

    } catch (err) {
        res.status(500).json({
            error: "Failed to merge coin data",
            message: err.message
        });
    }
});

/* Coin Details API */
router.get("/:id/details", async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `details:${id}`;
        const cached = coinsCache.get(cacheKey);

        if (cached) {
            res.set("X-Cache", "HIT");
            res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
            return res.json(cached);
        }

        // 1️⃣ Fetch coin info
        const infoRes = await axios.get(
            "https://pro-api.coinmarketcap.com/v1/cryptocurrency/info",
            {
                headers: {
                    "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY,
                    Accept: "application/json",
                },
                params: { id },
            }
        );

        // 2️⃣ Fetch latest quotes
        const quoteRes = await axios.get(
            "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest",
            {
                headers: {
                    "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY,
                    Accept: "application/json",
                },
                params: { id },
            }
        );

        const info = infoRes.data.data[id];
        const quote = quoteRes.data.data[id].quote.USD;

        // 3️⃣ Build clean response
        const result = {
            id,
            name: info.name,
            symbol: info.symbol,
            logo: info.logo,
            description: info.description,
            website: info.urls?.website?.[0] || "",
            price: quote.price,
            percent_change_1h: quote.percent_change_1h,
            percent_change_24h: quote.percent_change_24h,
            percent_change_7d: quote.percent_change_7d,
            market_cap: quote.market_cap,
            volume_24h: quote.volume_24h,
        };

        coinsCache.set(cacheKey, result, 30 * 1000);
        res.set("X-Cache", "MISS");
        res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
        res.json(result);
    } catch (err) {
        res.status(500).json({
            error: "Failed to fetch coin details",
            message: err.message,
        });
    }
});


/* Chart Data API — uses CoinGecko (free, no key required) */
const SYMBOL_TO_COINGECKO = {
    BTC: "bitcoin", ETH: "ethereum", USDT: "tether", BNB: "binancecoin",
    SOL: "solana", XRP: "ripple", USDC: "usd-coin", ADA: "cardano",
    AVAX: "avalanche-2", DOGE: "dogecoin", DOT: "polkadot", TRX: "tron",
    LINK: "chainlink", MATIC: "matic-network", TON: "the-open-network",
    SHIB: "shiba-inu", DAI: "dai", LTC: "litecoin", BCH: "bitcoin-cash",
    UNI: "uniswap", ATOM: "cosmos", XLM: "stellar", ETC: "ethereum-classic",
    FIL: "filecoin", APT: "aptos", NEAR: "near", IMX: "immutable-x",
    OP: "optimism", ARB: "arbitrum", PEPE: "pepe", MKR: "maker",
    AAVE: "aave", GRT: "the-graph", ALGO: "algorand", ICP: "internet-computer",
    VET: "vechain", SAND: "the-sandbox", MANA: "decentraland", XTZ: "tez",
    SUI: "sui", SEI: "sei-network", INJ: "injective-protocol",
    STX: "blockstack", RUNE: "thorchain", EGLD: "elrond-erd-2",
    HBAR: "hedera-hashgraph", FTM: "fantom", THETA: "theta-token",
    RENDER: "render-token", WLD: "worldcoin-wld",
    LEO: "leo-token", CRO: "crypto-com-chain", OKB: "okb",
    KAS: "kaspa", TAO: "bittensor", FET: "fetch-ai",
};

const GECKO_LIST_TTL = 24 * 60 * 60 * 1000;

async function getGeckoId(symbol) {
    const upper = symbol.toUpperCase();
    if (SYMBOL_TO_COINGECKO[upper]) return SYMBOL_TO_COINGECKO[upper];
    try {
        // Use chartCache for the CoinGecko coins list (long TTL)
        const geckoList = await chartCache.getOrSet(
            "gecko:coins-list",
            async () => {
                const listRes = await axios.get("https://api.coingecko.com/api/v3/coins/list");
                return listRes.data;
            },
            GECKO_LIST_TTL
        );
        const match = geckoList.find(c => c.symbol.toUpperCase() === upper);
        return match ? match.id : null;
    } catch {
        return null;
    }
}

router.get("/:id/chart", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const days = req.query.days || "7";
        const cacheKey = `chart:${id}:${days}`;

        const cached = chartCache.get(cacheKey);
        if (cached) {
            res.set("X-Cache", "HIT");
            res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=300");
            return res.json(cached);
        }

        const infoRes = await axios.get(
            "https://pro-api.coinmarketcap.com/v1/cryptocurrency/info",
            {
                headers: {
                    "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY,
                    Accept: "application/json",
                },
                params: { id },
            }
        );
        const symbol = infoRes.data.data[id]?.symbol;
        if (!symbol) {
            return res.status(404).json({ error: "Coin not found" });
        }

        const geckoId = await getGeckoId(symbol);
        if (!geckoId) {
            return res.status(404).json({ error: `No chart data available for ${symbol}` });
        }

        const chartRes = await axios.get(
            `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart`,
            { params: { vs_currency: "usd", days } }
        );

        const prices = chartRes.data.prices.map(([timestamp, price]) => ({
            time: timestamp,
            price: parseFloat(price.toFixed(2)),
        }));

        const result = { symbol, days, prices };

        // Chart TTL varies by time range
        const chartTTLs = { "1": 60 * 1000, "7": 2 * 60 * 1000, "30": 5 * 60 * 1000, "90": 10 * 60 * 1000 };
        chartCache.set(cacheKey, result, chartTTLs[days] || 2 * 60 * 1000);

        res.set("X-Cache", "MISS");
        res.set("Cache-Control", `public, max-age=${(chartTTLs[days] || 120000) / 1000}, stale-while-revalidate=300`);
        res.json(result);
    } catch (err) {
        res.status(500).json({
            error: "Failed to fetch chart data",
            message: err.message,
        });
    }
});


module.exports = router;
