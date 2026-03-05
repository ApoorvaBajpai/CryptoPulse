const express = require("express");
const { coinsCache, newsCache, chartCache, generalCache } = require("../services/cacheService");
const router = express.Router();

/**
 * GET /api/cache/stats
 * Returns cache statistics for all cache instances.
 * Useful for monitoring and debugging cache performance.
 */
router.get("/stats", (req, res) => {
    res.json({
        coins: coinsCache.getStats(),
        news: newsCache.getStats(),
        chart: chartCache.getStats(),
        general: generalCache.getStats(),
        timestamp: new Date().toISOString(),
    });
});

/**
 * POST /api/cache/clear
 * Clear all caches. Requires the ?confirm=true query param.
 */
router.post("/clear", (req, res) => {
    if (req.query.confirm !== "true") {
        return res.status(400).json({ error: "Add ?confirm=true to clear all caches" });
    }

    coinsCache.clear();
    newsCache.clear();
    chartCache.clear();
    generalCache.clear();

    res.json({ message: "All caches cleared", timestamp: new Date().toISOString() });
});

/**
 * POST /api/cache/clear/:namespace
 * Clear a specific cache namespace.
 */
router.post("/clear/:namespace", (req, res) => {
    const { namespace } = req.params;

    const cacheMap = {
        coins: coinsCache,
        news: newsCache,
        chart: chartCache,
        general: generalCache,
    };

    const cache = cacheMap[namespace];
    if (!cache) {
        return res.status(404).json({ error: `Unknown cache namespace: ${namespace}` });
    }

    cache.clear();
    res.json({ message: `Cache '${namespace}' cleared`, timestamp: new Date().toISOString() });
});

module.exports = router;
