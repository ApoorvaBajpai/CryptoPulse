/**
 * In-Memory Browser Cache (L1)
 * ============================
 * A fast, synchronous-access in-memory cache that sits IN FRONT OF the existing
 * IndexedDB cache (L2). This creates a two-tier caching architecture:
 *
 *   Request → L1 (Memory) → L2 (IndexedDB) → Network
 *
 * Benefits:
 *  - Instant cache reads (no async IndexedDB overhead)
 *  - Reduces IndexedDB transaction load
 *  - Supports stale-while-revalidate pattern for zero-latency UX
 *  - LRU eviction to prevent memory bloat
 *  - Cache event listeners for debugging & analytics
 */

export interface MemoryCacheEntry<T = any> {
    data: T;
    expiry: number;
    staleExpiry: number;   // When the stale-while-revalidate window closes
    createdAt: number;
    key: string;
    size?: number;         // Approximate size in bytes
}

export interface MemoryCacheOptions {
    maxEntries?: number;
    defaultTTL?: number;         // ms
    staleWhileRevalidate?: number; // additional ms beyond TTL where stale data is OK
    onHit?: (key: string) => void;
    onMiss?: (key: string) => void;
    onEvict?: (key: string) => void;
}

export interface CacheStats {
    hits: number;
    misses: number;
    staleHits: number;
    sets: number;
    evictions: number;
    size: number;
    maxEntries: number;
    hitRate: string;
    memoryEstimate: string;
}

class MemoryCache {
    private store = new Map<string, MemoryCacheEntry>();
    private maxEntries: number;
    private defaultTTL: number;
    private staleWhileRevalidate: number;
    private stats = {
        hits: 0,
        misses: 0,
        staleHits: 0,
        sets: 0,
        evictions: 0,
    };
    private options: MemoryCacheOptions;

    constructor(options: MemoryCacheOptions = {}) {
        this.maxEntries = options.maxEntries ?? 100;
        this.defaultTTL = options.defaultTTL ?? 60 * 1000; // 1 minute
        this.staleWhileRevalidate = options.staleWhileRevalidate ?? 30 * 1000; // 30s stale window
        this.options = options;
    }

    /**
     * Get a value from the L1 memory cache.
     * Returns { data, isStale } or null if not found / fully expired.
     */
    get<T>(key: string): { data: T; isStale: boolean } | null {
        const entry = this.store.get(key);

        if (!entry) {
            this.stats.misses++;
            this.options.onMiss?.(key);
            return null;
        }

        const now = Date.now();

        // Fully expired (past stale window too)
        if (now > entry.staleExpiry) {
            this.store.delete(key);
            this.stats.misses++;
            this.options.onMiss?.(key);
            return null;
        }

        // Move to end for LRU
        this.store.delete(key);
        this.store.set(key, entry);

        // Fresh hit
        if (now <= entry.expiry) {
            this.stats.hits++;
            this.options.onHit?.(key);
            return { data: entry.data as T, isStale: false };
        }

        // Stale hit (within stale-while-revalidate window)
        this.stats.staleHits++;
        this.options.onHit?.(key);
        return { data: entry.data as T, isStale: true };
    }

    /**
     * Get the raw data (ignoring stale status) – simpler API for most use cases.
     */
    getData<T>(key: string): T | null {
        const result = this.get<T>(key);
        return result ? result.data : null;
    }

    /**
     * Store a value in the L1 memory cache.
     */
    set<T>(key: string, data: T, ttl?: number): void {
        const effectiveTTL = ttl ?? this.defaultTTL;

        // Evict LRU if at capacity
        if (!this.store.has(key) && this.store.size >= this.maxEntries) {
            this._evictLRU();
        }

        // Delete first to reset Map ordering
        this.store.delete(key);

        const now = Date.now();
        const entry: MemoryCacheEntry<T> = {
            data,
            expiry: now + effectiveTTL,
            staleExpiry: now + effectiveTTL + this.staleWhileRevalidate,
            createdAt: now,
            key,
            size: this._estimateSize(data),
        };

        this.store.set(key, entry);
        this.stats.sets++;
    }

    /**
     * Delete a specific key.
     */
    delete(key: string): boolean {
        return this.store.delete(key);
    }

    /**
     * Delete all keys matching a prefix.
     */
    invalidatePrefix(prefix: string): number {
        let count = 0;
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
                count++;
            }
        }
        return count;
    }

    /**
     * Clear all entries.
     */
    clear(): void {
        this.store.clear();
    }

    /**
     * Check if a key exists and is still fresh.
     */
    has(key: string): boolean {
        const entry = this.store.get(key);
        if (!entry) return false;
        return Date.now() <= entry.expiry;
    }

    /**
     * Get cache statistics.
     */
    getStats(): CacheStats {
        const total = this.stats.hits + this.stats.staleHits + this.stats.misses;
        let totalSize = 0;
        for (const entry of this.store.values()) {
            totalSize += entry.size ?? 0;
        }

        return {
            ...this.stats,
            size: this.store.size,
            maxEntries: this.maxEntries,
            hitRate: total > 0 ? `${(((this.stats.hits + this.stats.staleHits) / total) * 100).toFixed(1)}%` : "0%",
            memoryEstimate: this._formatBytes(totalSize),
        };
    }

    /**
     * Get all current keys (for debugging).
     */
    keys(): string[] {
        return [...this.store.keys()];
    }

    // ─── Private Helpers ───────────────────────────────────

    private _evictLRU(): void {
        const firstKey = this.store.keys().next().value;
        if (firstKey !== undefined) {
            this.store.delete(firstKey);
            this.stats.evictions++;
            this.options.onEvict?.(firstKey);
        }
    }

    private _estimateSize(data: any): number {
        try {
            return new Blob([JSON.stringify(data)]).size;
        } catch {
            return 0;
        }
    }

    private _formatBytes(bytes: number): string {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i] || "MB"}`;
    }
}

export { MemoryCache };
export default MemoryCache;
