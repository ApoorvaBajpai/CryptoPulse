import { MemoryCache } from "./memoryCache";

/**
 * Two-Tier Browser Cache Architecture
 * ====================================
 *
 *    Request
 *       │
 *       ▼
 *   ┌────────────────────┐
 *   │  L1: Memory Cache  │  ← Instant, synchronous-like access
 *   │  (MemoryCache)     │     ~0ms latency, volatile
 *   └────────┬───────────┘
 *            │ miss
 *            ▼
 *   ┌────────────────────┐
 *   │  L2: IndexedDB     │  ← Persistent storage, survives refresh
 *   │  (CacheManager)    │     ~1-5ms latency, durable
 *   └────────┬───────────┘
 *            │ miss
 *            ▼
 *       Network Fetch
 *
 * On a cache SET, data is written to BOTH layers simultaneously.
 * On a cache GET:
 *   1. Check L1 (memory) first — instant return
 *   2. If L1 miss → check L2 (IndexedDB) — promote to L1 on hit
 *   3. If L2 miss → return null (caller fetches from network)
 *
 * On a mutation (POST/PUT/DELETE), BOTH layers are cleared.
 */

// ─── Constants ─────────────────────────────────────────────

const DB_NAME = "CryptoPulseCache";
const DB_VERSION = 1;
const STORE_NAME = "api_responses";
const DEFAULT_TTL = 3600 * 1000; // 1 hour in ms

// ─── Types ─────────────────────────────────────────────────

export interface CacheEntry<T = any> {
    url: string;
    data: T;
    expiry: number;
    timestamp: number;
}

// ─── L1: Memory Cache Instance ─────────────────────────────

const memoryCache = new MemoryCache({
    maxEntries: 150,
    defaultTTL: 5 * 60 * 1000,       // 5 minutes for L1
    staleWhileRevalidate: 60 * 1000,  // 1 minute stale window
    onHit: (key) => {
        if (import.meta.env.DEV) {
            console.log(`%c[L1 HIT] ${key}`, "color: #10b981; font-weight: bold");
        }
    },
    onMiss: (key) => {
        if (import.meta.env.DEV) {
            console.log(`%c[L1 MISS] ${key}`, "color: #f59e0b");
        }
    },
});

// ─── L2: IndexedDB Cache Manager ───────────────────────────

class IndexedDBCache {
    private db: IDBDatabase | null = null;

    private async getDB(): Promise<IDBDatabase> {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: "url" });
                }
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onerror = () => reject(request.error);
        });
    }

    async get<T>(url: string): Promise<T | null> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, "readonly");
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(url);

                request.onsuccess = () => {
                    const entry = request.result as CacheEntry<T>;
                    if (entry && entry.expiry > Date.now()) {
                        if (import.meta.env.DEV) {
                            console.log(`%c[L2 HIT] ${url}`, "color: #6366f1; font-weight: bold");
                        }
                        resolve(entry.data);
                    } else {
                        if (entry) this.delete(url); // Cleanup expired
                        if (import.meta.env.DEV) {
                            console.log(`%c[L2 MISS] ${url}`, "color: #ef4444");
                        }
                        resolve(null);
                    }
                };
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.error("IndexedDB Get Error:", err);
            return null;
        }
    }

    async set<T>(url: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
        try {
            const db = await this.getDB();
            const entry: CacheEntry<T> = {
                url,
                data,
                timestamp: Date.now(),
                expiry: Date.now() + ttl,
            };

            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, "readwrite");
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(entry);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.error("IndexedDB Set Error:", err);
        }
    }

    async delete(url: string): Promise<void> {
        try {
            const db = await this.getDB();
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            store.delete(url);
        } catch (err) {
            console.error("IndexedDB Delete Error:", err);
        }
    }

    async clear(): Promise<void> {
        try {
            const db = await this.getDB();
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            store.clear();
        } catch (err) {
            console.error("IndexedDB Clear Error:", err);
        }
    }
}

// ─── Two-Tier Cache Manager ─────────────────────────────────

class TwoTierCacheManager {
    private l1 = memoryCache;
    private l2 = new IndexedDBCache();

    /**
     * Get from cache (L1 → L2 → null).
     * On L2 hit, data is promoted to L1 for future instant access.
     */
    async get<T>(url: string): Promise<T | null> {
        // 1. Check L1 (memory) — instant
        const l1Result = this.l1.get<T>(url);
        if (l1Result) {
            if (l1Result.isStale) {
                // Return stale data immediately, but don't block
                // The caller should revalidate in the background
                return l1Result.data;
            }
            return l1Result.data;
        }

        // 2. Check L2 (IndexedDB) — async
        const l2Data = await this.l2.get<T>(url);
        if (l2Data !== null) {
            // Promote to L1 for future instant access
            this.l1.set(url, l2Data);
            return l2Data;
        }

        // 3. Cache miss everywhere
        return null;
    }

    /**
     * Check if a stale-while-revalidate background fetch should happen.
     * Returns true if L1 has data but it's stale.
     */
    shouldRevalidate(url: string): boolean {
        const result = this.l1.get(url);
        return result !== null && result.isStale;
    }

    /**
     * Store data in both L1 and L2 simultaneously.
     */
    async set<T>(url: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
        // Write to L1 (instant)
        this.l1.set(url, data, Math.min(ttl, 5 * 60 * 1000)); // L1 max 5 min

        // Write to L2 (async, full TTL)
        await this.l2.set(url, data, ttl);
    }

    /**
     * Delete from both layers.
     */
    async delete(url: string): Promise<void> {
        this.l1.delete(url);
        await this.l2.delete(url);
    }

    /**
     * Clear ALL caches (both layers).
     */
    async clear(): Promise<void> {
        this.l1.clear();
        await this.l2.clear();
    }

    /**
     * Invalidate all keys matching a prefix in L1 + clear L2.
     */
    async invalidatePattern(prefix: string): Promise<void> {
        this.l1.invalidatePrefix(prefix);
        // IndexedDB doesn't support prefix-based deletion easily,
        // so we clear the whole L2 store on pattern invalidation
        await this.l2.clear();
    }

    /**
     * Get combined cache statistics.
     */
    getStats() {
        return {
            l1: this.l1.getStats(),
            keys: this.l1.keys(),
        };
    }
}

// ─── Export singleton ──────────────────────────────────────

export const cacheManager = new TwoTierCacheManager();

// Also export the raw memory cache for components that need direct L1 access
export { memoryCache, MemoryCache };
