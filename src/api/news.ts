export type NewsArticle = {
    title: string;
    source: string;
    image: string;
    url: string;
    published_at: string;
    sentiment: number;
};

export type NewsOptions = {
    symbols?: string;
    limit?: number;
    search?: string;
};

import { cacheManager } from "./cache";

export const fetchNews = async (options: NewsOptions = {}): Promise<NewsArticle[]> => {
    try {
        const { symbols, limit, search } = options;
        const params = new URLSearchParams();

        if (symbols) params.append("symbols", symbols);
        if (limit) params.append("limit", limit.toString());
        if (search) params.append("search", search);

        const url = `http://localhost:5000/api/news${params.toString() ? `?${params.toString()}` : ""}`;

        // Check cache
        const cached = await cacheManager.get<NewsArticle[]>(url);
        if (cached) return cached;

        const res = await fetch(url);
        if (!res.ok) {
            throw new Error("Failed to fetch news");
        }
        const data = await res.json();

        // Store in cache
        await cacheManager.set(url, data);

        return data;
    } catch (err) {
        console.error("News API Error:", err);
        return [];
    }
};
