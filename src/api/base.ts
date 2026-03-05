import { getAuth } from "firebase/auth";
import { cacheManager } from "./cache";

/**
 * Revalidation tracker — prevents duplicate background fetches
 * for the same URL when using stale-while-revalidate.
 */
const pendingRevalidations = new Set<string>();

export async function authFetch(
    url: string,
    options: RequestInit = {}
) {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
        throw new Error("User not logged in");
    }

    // Only cache GET requests
    const isGet = !options.method || options.method.toUpperCase() === "GET";

    if (isGet) {
        const cached = await cacheManager.get(url);
        if (cached) {
            // If the L1 cache says data is stale, trigger a background revalidation
            if (cacheManager.shouldRevalidate(url) && !pendingRevalidations.has(url)) {
                pendingRevalidations.add(url);
                // Fire-and-forget background fetch
                backgroundRevalidate(url, user).finally(() => {
                    pendingRevalidations.delete(url);
                });
            }
            return cached;
        }
    }

    const token = await user.getIdToken();

    const res = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
        },
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "API error");
    }

    const data = await res.json();

    if (isGet) {
        // Determine TTL from Cache-Control header if available
        const ttl = parseCacheControlMaxAge(res.headers.get("Cache-Control"));
        await cacheManager.set(url, data, ttl);
    } else {
        // Clear all cache on mutations (Buy/Sell) to ensure fresh data across app
        await cacheManager.clear();
    }

    return data;
}

/**
 * Background revalidation: fetches fresh data and updates the cache
 * without blocking the UI. The user sees stale data instantly, and
 * the next request will get fresh data.
 */
async function backgroundRevalidate(url: string, user: any): Promise<void> {
    try {
        const token = await user.getIdToken();
        const res = await fetch(url, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok) return;

        const data = await res.json();
        const ttl = parseCacheControlMaxAge(res.headers.get("Cache-Control"));
        await cacheManager.set(url, data, ttl);

        if (import.meta.env.DEV) {
            console.log(`%c[REVALIDATED] ${url}`, "color: #8b5cf6; font-weight: bold");
        }
    } catch (err) {
        // Silently fail — stale data is already being served
        if (import.meta.env.DEV) {
            console.warn(`[REVALIDATION FAILED] ${url}`, err);
        }
    }
}

/**
 * Parse the max-age value from a Cache-Control header.
 * Returns TTL in milliseconds, or the default 1-hour TTL.
 */
function parseCacheControlMaxAge(cacheControl: string | null): number {
    const DEFAULT_TTL = 3600 * 1000; // 1 hour
    if (!cacheControl) return DEFAULT_TTL;

    const match = cacheControl.match(/max-age=(\d+)/);
    if (match) {
        return parseInt(match[1], 10) * 1000; // Convert seconds → ms
    }

    return DEFAULT_TTL;
}
