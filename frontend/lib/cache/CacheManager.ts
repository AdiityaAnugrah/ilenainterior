/**
 * CacheManager - Multi-layer caching with LRU eviction and TTL support
 * 
 * Features:
 * - LRU (Least Recently Used) eviction policy
 * - TTL (Time-To-Live) support with automatic expiration
 * - Cache invalidation by key, pattern, or tag
 * - Cache statistics tracking (hit rate, miss rate, total size)
 * - Configurable max size (default 200MB)
 * - Size estimation for different data types
 */

export interface CacheEntry<T> {
  key: string;
  data: T;
  size: number;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  tags?: string[];
}

export interface CacheConfig {
  maxSize: number; // in bytes (default 200MB = 200 * 1024 * 1024)
  maxAge: number; // in ms (default 5 minutes = 300000)
  enableLRU: boolean;
  enableStats: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  missRate: number;
  totalSize: number;
  entryCount: number;
}

export class CacheManager<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null;

  constructor(config?: Partial<CacheConfig>) {
    this.cache = new Map();
    this.config = {
      maxSize: config?.maxSize ?? 200 * 1024 * 1024, // 200MB default
      maxAge: config?.maxAge ?? 300000, // 5 minutes default
      enableLRU: config?.enableLRU ?? true,
      enableStats: config?.enableStats ?? true,
    };
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      missRate: 0,
      totalSize: 0,
      entryCount: 0,
    };
    this.cleanupTimer = null;

    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  /**
   * Set a value in the cache
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (optional, uses config.maxAge if not provided)
   */
  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const size = this.estimateSize(data);
    const expiresAt = now + (ttl ?? this.config.maxAge);

    // Check if adding this entry would exceed max size
    const potentialSize = this.stats.totalSize + size;
    if (potentialSize > this.config.maxSize && this.config.enableLRU) {
      this.evictLRU();
    }

    // If entry already exists, remove its size from total
    const existingEntry = this.cache.get(key);
    if (existingEntry) {
      this.stats.totalSize -= existingEntry.size;
    }

    const entry: CacheEntry<T> = {
      key,
      data,
      size,
      timestamp: now,
      expiresAt,
      accessCount: 0,
      lastAccessed: now,
      tags: [],
    };

    this.cache.set(key, entry);
    this.stats.totalSize += size;
    this.stats.entryCount = this.cache.size;
  }

  /**
   * Get a value from the cache
   * @param key - Cache key
   * @returns Cached data or null if not found or expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.config.enableStats) {
        this.stats.misses++;
        this.updateHitRate();
      }
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key);
      if (this.config.enableStats) {
        this.stats.misses++;
        this.updateHitRate();
      }
      return null;
    }

    // Update access time and count
    this.updateAccessTime(key);

    if (this.config.enableStats) {
      this.stats.hits++;
      this.updateHitRate();
    }

    return entry.data;
  }

  /**
   * Check if a key exists in the cache
   * @param key - Cache key
   * @returns True if key exists and not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a specific key from the cache
   * @param key - Cache key
   */
  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.stats.totalSize -= entry.size;
      this.cache.delete(key);
      this.stats.entryCount = this.cache.size;
    }
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.totalSize = 0;
    this.stats.entryCount = 0;
  }

  /**
   * Invalidate cache entries by pattern
   * @param pattern - String or RegExp pattern to match keys
   */
  invalidate(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToDelete: string[] = [];

    for (const [key] of this.cache) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.delete(key));
  }

  /**
   * Invalidate cache entries by tag
   * @param tag - Tag to match
   */
  invalidateByTag(tag: string): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (entry.tags && entry.tags.includes(tag)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.delete(key));
  }

  /**
   * Set tags for a cache entry
   * @param key - Cache key
   * @param tags - Array of tags
   */
  setTags(key: string, tags: string[]): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.tags = tags;
    }
  }

  /**
   * Evict least recently used entries until size is under limit
   * @private
   */
  private evictLRU(): void {
    // Sort entries by lastAccessed (oldest first)
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.lastAccessed - b.lastAccessed
    );

    // Evict until we're under 80% of max size
    const targetSize = this.config.maxSize * 0.8;
    let currentSize = this.stats.totalSize;

    for (const [key, entry] of entries) {
      if (currentSize <= targetSize) break;
      this.delete(key);
      currentSize -= entry.size;
    }
  }

  /**
   * Update access time for a cache entry
   * @param key - Cache key
   * @private
   */
  private updateAccessTime(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastAccessed = Date.now();
      entry.accessCount++;
    }
  }

  /**
   * Get cache statistics
   * @returns Cache statistics object
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      missRate: 0,
      totalSize: this.stats.totalSize,
      entryCount: this.stats.entryCount,
    };
  }

  /**
   * Check if a cache entry is expired
   * @param entry - Cache entry
   * @returns True if expired
   * @private
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Estimate size of data in bytes
   * @param data - Data to estimate
   * @returns Estimated size in bytes
   * @private
   */
  private estimateSize(data: T): number {
    if (data === null || data === undefined) {
      return 0;
    }

    // String
    if (typeof data === 'string') {
      return data.length * 2; // 2 bytes per character (UTF-16)
    }

    // Number, Boolean
    if (typeof data === 'number' || typeof data === 'boolean') {
      return 8;
    }

    // Array
    if (Array.isArray(data)) {
      return data.reduce((total, item) => total + this.estimateSize(item), 0);
    }

    // Object
    if (typeof data === 'object') {
      // Check for special types
      if (data instanceof ArrayBuffer) {
        return (data as ArrayBuffer).byteLength;
      }

      if (data instanceof Blob) {
        return (data as Blob).size;
      }

      // For Three.js textures (if available)
      if ('image' in data && data.image) {
        const image = (data as any).image;
        if (image.width && image.height) {
          // Estimate: width * height * 4 bytes (RGBA)
          return image.width * image.height * 4;
        }
      }

      // For Three.js geometries (if available)
      if ('attributes' in data && (data as any).attributes) {
        const attributes = (data as any).attributes;
        let size = 0;
        for (const key in attributes) {
          const attribute = attributes[key];
          if (attribute.array) {
            size += attribute.array.byteLength;
          }
        }
        return size;
      }

      // Generic object - estimate from JSON string
      try {
        return JSON.stringify(data).length * 2;
      } catch (e) {
        // Circular reference or non-serializable
        return 1024; // Default 1KB estimate
      }
    }

    return 0;
  }

  /**
   * Cleanup expired entries
   * @private
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.delete(key));
  }

  /**
   * Start periodic cleanup of expired entries
   * @private
   */
  private startPeriodicCleanup(): void {
    // Run cleanup every minute
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Stop periodic cleanup
   */
  stopPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Update hit rate and miss rate statistics
   * @private
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    if (total > 0) {
      this.stats.hitRate = this.stats.hits / total;
      this.stats.missRate = this.stats.misses / total;
    }
  }

  /**
   * Get all cache entries (for debugging)
   * @returns Array of cache entries
   */
  getEntries(): CacheEntry<T>[] {
    return Array.from(this.cache.values());
  }

  /**
   * Get cache size in human-readable format
   * @returns Formatted size string
   */
  getFormattedSize(): string {
    return this.formatBytes(this.stats.totalSize);
  }

  /**
   * Get max size in human-readable format
   * @returns Formatted size string
   */
  getFormattedMaxSize(): string {
    return this.formatBytes(this.config.maxSize);
  }

  /**
   * Format bytes to human-readable string
   * @param bytes - Number of bytes
   * @returns Formatted string
   * @private
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Destroy the cache manager and cleanup resources
   */
  destroy(): void {
    this.stopPeriodicCleanup();
    this.clear();
  }
}

// Export a singleton instance for global use
export const globalCacheManager = new CacheManager();
