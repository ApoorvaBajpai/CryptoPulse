import { authFetch } from "./base";

const API_BASE = "http://localhost:5000";

/* =======================
   Portfolio APIs
======================= */

export const getPortfolio = () =>
    authFetch(`${API_BASE}/api/portfolio`);


export const buyCoin = (
    coinId: string,
    symbol: string,
    quantity: number,
    price: number
) =>
    authFetch(`http://localhost:5000/api/portfolio/buy`, {
        method: "POST",
        body: JSON.stringify({ coinId, symbol, quantity, price }),
    });


export const sellCoin = (
    coinId: string,
    quantity: number
) =>
    authFetch(`${API_BASE}/api/portfolio/sell`, {
        method: "POST",
        body: JSON.stringify({ coinId, quantity }),
    });
