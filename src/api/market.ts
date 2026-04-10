import { authFetch } from "./base";

export const getMarketPrices = (skipCache: boolean = false) =>
    authFetch("http://localhost:5000/api/coins/listings-with-info", {}, skipCache);

export const getCoinDetails = (id: string, skipCache: boolean = false) =>
    authFetch(`http://localhost:5000/api/coins/${id}/details`, {}, skipCache);

export const getCoinChart = (id: string, days: string = "7", skipCache: boolean = false) =>
    authFetch(`http://localhost:5000/api/coins/${id}/chart?days=${days}`, {}, skipCache);
