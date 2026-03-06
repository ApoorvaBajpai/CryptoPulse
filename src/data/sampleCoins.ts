import type { Coin } from "../types/coin";

export const sampleCoins: Coin[] = [
  {
    id: 1,
    symbol: "BTC",
    name: "Bitcoin",
    price: 90388,
    percent_change_24h: -1.95,
    market_cap: 1804206550985,
    volume_24h: 68658471436,
  },
  {
    id: 2,
    symbol: "ETH",
    name: "Ethereum",
    price: 3201,
    percent_change_24h: -5.0,
    market_cap: 386365000499,
    volume_24h: 34373045631,
  },
  {
    id: 3,
    symbol: "USDT",
    name: "Tether USDt",
    price: 1.000035,
    percent_change_24h: 0.0,
    market_cap: 186078034602,
    volume_24h: 113024005112,
  },
  {
    id: 4,
    symbol: "XRP",
    name: "XRP",
    price: 2.003067,
    percent_change_24h: -2.82,
    market_cap: 120848298520,
    volume_24h: 4126665352,
  },
  {
    id: 5,
    symbol: "BNB",
    name: "BNB",
    price: 872.540902,
    percent_change_24h: -2.52,
    market_cap: 120179970507,
    volume_24h: 2736075267,
  },
];
