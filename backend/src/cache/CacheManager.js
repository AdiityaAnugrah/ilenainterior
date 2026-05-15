/**
 * CacheManager - API Response Caching with TTL and Invalidation Support
 * 
 * Features:
 * - Express middleware for automatic API response caching
 * - TTL (Time To Live) support with default 5 minutes
 * - Pattern-based cache invalidation using RegExp
 * - Cache statistics tracking (hits, misses, size)
 * - X-Cache header (HIT or MISS) for debugging
 * - In-memory storage using Map
 */

class APICacheManager {
  constructor(config = {}) {
    this.cache = new Map();
    this.config = {
      defaultTTL: config.defaultTTL || 300000, // 5 minutes default
      maxSize: config.maxSize || 100, // Maximum number of cache entries
      enableStats: config.enableStats !== false, // Enable stats by default
    };
    
    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0,
      size: 0,
    };
  }

  /**
   * Express middleware for automatic caching
   * Intercepts res.json() to cache responses
   * 
   * @returns {Function} Express middleware function
   */
  middleware() {
    return (req, res, next) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      const key = this.generateKey(req);
      const cached = this.get(key);

      if (cached) {
        // Cache HIT
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Cache MISS - intercept res.json to cache the response
      res.set('X-Cache', 'MISS');
      const originalJson = res.json.bind(res);
      
      res.json = (data) => {
        // Cache the response data
        this.set(key, data);
        return originalJson(data);
      };

      next();
    };
  }

  /**
   * Generate cache key from request
   * Format: METHOD:PATH:QUERY
   * 
   * @param {Object} req - Express request object
   * @returns {string} Cache key
   */
  generateKey(req) {
    const method = req.method;
    const path = req.path;
    const query = JSON.stringify(req.query);
    return `${method}:${path}:${query}`;
  }

  /**
   * Set cache entry with TTL
   * 
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, data, ttl) {
    const expiresAt = Date.now() + (ttl || this.config.defaultTTL);
    
    // Check if we need to evict entries (simple size-based eviction)
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      expiresAt,
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
    });

    if (this.config.enableStats) {
      this.stats.sets++;
      this.stats.size = this.cache.size;
    }
  }

  /**
   * Get cache entry
   * Returns null if not found or expired
   * 
   * @param {string} key - Cache key
   * @returns {*} Cached data or null
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.config.enableStats) {
        this.stats.misses++;
      }
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      if (this.config.enableStats) {
        this.stats.misses++;
        this.stats.size = this.cache.size;
      }
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    if (this.config.enableStats) {
      this.stats.hits++;
    }

    return entry.data;
  }

  /**
   * Check if key exists in cache (and not expired)
   * 
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      if (this.config.enableStats) {
        this.stats.size = this.cache.size;
      }
      return false;
    }
    
    return true;
  }

  /**
   * Delete specific cache entry
   * 
   * @param {string} key - Cache key
   * @returns {boolean} True if deleted, false if not found
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted && this.config.enableStats) {
      this.stats.size = this.cache.size;
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    if (this.config.enableStats) {
      this.stats.size = 0;
    }
  }

  /**
   * Invalidate cache entries matching pattern
   * Supports string prefix matching or RegExp
   * 
   * @param {string|RegExp} pattern - Pattern to match keys
   * @returns {number} Number of entries invalidated
   */
  invalidate(pattern) {
    let count = 0;
    const isRegExp = pattern instanceof RegExp;

    for (const key of this.cache.keys()) {
      let shouldDelete = false;

      if (isRegExp) {
        shouldDelete = pattern.test(key);
      } else {
        // String prefix matching
        shouldDelete = key.includes(pattern);
      }

      if (shouldDelete) {
        this.cache.delete(key);
        count++;
      }
    }

    if (this.config.enableStats) {
      this.stats.invalidations += count;
      this.stats.size = this.cache.size;
    }

    return count;
  }

  /**
   * Evict oldest cache entry (by creation time)
   * Used when cache size exceeds maxSize
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Cleanup expired entries
   * Should be called periodically
   * 
   * @returns {number} Number of entries cleaned up
   */
  cleanup() {
    let count = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    }

    if (this.config.enableStats && count > 0) {
      this.stats.size = this.cache.size;
    }

    return count;
  }

  /**
   * Get cache statistics
   * 
   * @returns {Object} Cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    const missRate = totalRequests > 0 ? (this.stats.misses / totalRequests) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      invalidations: this.stats.invalidations,
      size: this.stats.size,
      hitRate: hitRate.toFixed(2) + '%',
      missRate: missRate.toFixed(2) + '%',
      totalRequests,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0,
      size: this.cache.size,
    };
  }

  /**
   * Get all cache keys
   * 
   * @returns {Array<string>} Array of cache keys
   */
  getKeys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entry details (for debugging)
   * 
   * @param {string} key - Cache key
   * @returns {Object|null} Entry details or null
   */
  getEntryDetails(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    return {
      key,
      expiresAt: new Date(entry.expiresAt).toISOString(),
      createdAt: new Date(entry.createdAt).toISOString(),
      lastAccessed: new Date(entry.lastAccessed).toISOString(),
      accessCount: entry.accessCount,
      ttl: entry.expiresAt - Date.now(),
      expired: Date.now() > entry.expiresAt,
    };
  }
}

module.exports = APICacheManager;
