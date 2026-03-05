/**
 * In-Memory Cache Service
 * =======================
 * A lightweight, high-performance in-memory cache with:
 *  - Per-key TTL support
 *  - LRU eviction when max capacity is reached
 *  - Namespace-based invalidation (e.g. clear all "coins:*" entries)
 *  - Cache hit/miss statistics for monitoring
 *  - Automatic stale entry cleanup
 */

class CacheService {
    constructor(options = {}) {
        /** @type {Map<string, {data: any, expiry: number, createdAt: number}>} */
        this.store = new Map();

        /** Maximum number of entries before LRU eviction kicks in */
        this.maxSize = options.maxSize || 500;

        /** Default TTL in milliseconds */
        this.defaultTTL = options.defaultTTL || 60 * 1000; // 1 minute

        /** Statistics */
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            evictions: 0,
            invalidations: 0,
        };

        // Periodic cleanup of expired entries every 5 minutes
        this._cleanupInterval = setInterval(() => this._cleanup(), 5 * 60 * 1000);
        // Allow Node to exit even if the interval is still running
        if (this._cleanupInterval.unref) {
            this._cleanupInterval.unref();
        }
    }

    /**
     * Get a value from the cache.
     * @param {string} key
     * @returns {any|null} Cached value or null if not found / expired
     */
    get(key) {
        const entry = this.store.get(key);

        if (!entry) {
            this.stats.misses++;
            return null;
        }

        // Check expiry
        if (Date.now() > entry.expiry) {
            this.store.delete(key);
            this.stats.misses++;
            return null;
        }

        // Move to end of Map (most recently used) for LRU
        this.store.delete(key);
        this.store.set(key, entry);

        this.stats.hits++;
        return entry.data;
    }

    /**
     * Store a value in the cache.
     * @param {string} key
     * @param {any} data
     * @param {number} [ttl] TTL in milliseconds (uses defaultTTL if omitted)
     */
    set(key, data, ttl) {
        const effectiveTTL = ttl != null ? ttl : this.defaultTTL;

        // If we're at capacity and this is a new key, evict the oldest (LRU)
        if (!this.store.has(key) && this.store.size >= this.maxSize) {
            this._evictLRU();
        }

        // Delete first to reset position in Map for LRU ordering
        this.store.delete(key);

        this.store.set(key, {
            data,
            expiry: Date.now() + effectiveTTL,
            createdAt: Date.now(),
        });

        this.stats.sets++;
    }

    /**
     * Delete a specific key from the cache.
     * @param {string} key
     * @returns {boolean}
     */
    delete(key) {
        return this.store.delete(key);
    }

    /**
     * Invalidate all keys matching a namespace prefix.
     * e.g., invalidateNamespace("coins") clears "coins:listings", "coins:1:details", etc.
     * @param {string} namespace
     */
    invalidateNamespace(namespace) {
        const prefix = namespace.endsWith(":") ? namespace : `${namespace}:`;
        let count = 0;
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
                count++;
            }
        }
        this.stats.invalidations += count;
        return count;
    }

    /**
     * Clear all entries.
     */
    clear() {
        const size = this.store.size;
        this.store.clear();
        this.stats.invalidations += size;
    }

    /**
     * Get cache statistics.
     * @returns {{ hits: number, misses: number, sets: number, evictions: number, invalidations: number, size: number, hitRate: string }}
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        return {
            ...this.stats,
            size: this.store.size,
            maxSize: this.maxSize,
            hitRate: total > 0 ? `${((this.stats.hits / total) * 100).toFixed(1)}%` : "0%",
        };
    }

    /**
     * Get or set — fetch from cache, or compute & store if missing.
     * @param {string} key
     * @param {() => Promise<any>} fetchFn  Async function to produce the value
     * @param {number} [ttl]
     * @returns {Promise<any>}
     */
    async getOrSet(key, fetchFn, ttl) {
        const cached = this.get(key);
        if (cached !== null) return cached;

        const data = await fetchFn();
        this.set(key, data, ttl);
        return data;
    }

    /**
     * Wrap an Express route handler with caching.
     * @param {string} keyFn  Function that receives (req) and returns the cache key
     * @param {number} [ttl]  TTL in milliseconds
     * @returns {Function} Express middleware
     */
    middleware(keyFn, ttl) {
        return (req, res, next) => {
            const key = typeof keyFn === "function" ? keyFn(req) : keyFn;
            const cached = this.get(key);

            if (cached !== null) {
                // Set cache-indicator header
                res.set("X-Cache", "HIT");
                res.set("X-Cache-Key", key);
                return res.json(cached);
            }

            // Override res.json to intercept the response and cache it
            const originalJson = res.json.bind(res);
            res.json = (data) => {
                // Only cache successful responses (status 2xx)
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    this.set(key, data, ttl);
                }
                res.set("X-Cache", "MISS");
                res.set("X-Cache-Key", key);
                return originalJson(data);
            };

            next();
        };
    }

    // ─── Private ───────────────────────────────────────────

    /** Evict the least recently used entry (first entry in Map) */
    _evictLRU() {
        const firstKey = this.store.keys().next().value;
        if (firstKey !== undefined) {
            this.store.delete(firstKey);
            this.stats.evictions++;
        }
    }

    /** Remove all expired entries */
    _cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.store) {
            if (now > entry.expiry) {
                this.store.delete(key);
            }
        }
    }

    /** Destroy the cache service (clear interval) */
    destroy() {
        clearInterval(this._cleanupInterval);
        this.store.clear();
    }
}

// ─── Create specialized cache instances ────────────────────────

/** Cache for coin listings & details — 30 second TTL */
const coinsCache = new CacheService({
    maxSize: 200,
    defaultTTL: 30 * 1000, // 30 seconds
});

/** Cache for news articles — 5 minute TTL */
const newsCache = new CacheService({
    maxSize: 50,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
});

/** Cache for chart data — 2 minute TTL */
const chartCache = new CacheService({
    maxSize: 300,
    defaultTTL: 2 * 60 * 1000, // 2 minutes
});

/** General purpose cache */
const generalCache = new CacheService({
    maxSize: 100,
    defaultTTL: 60 * 1000, // 1 minute
});

module.exports = {
    CacheService,
    coinsCache,
    newsCache,
    chartCache,
    generalCache,
};
