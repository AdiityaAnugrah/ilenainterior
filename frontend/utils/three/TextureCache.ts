import * as THREE from 'three';

/**
 * Cache entry for storing textures with metadata
 */
interface CacheEntry {
  texture: THREE.Texture;
  key: string;
  size: number; // Estimated memory size in bytes
  lastAccessed: number; // Timestamp
}

/**
 * Cache statistics for monitoring performance
 */
interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalMemoryUsage: number; // In bytes
  entryCount: number;
}

/**
 * Parameters for generating cache keys
 */
export interface TextureCacheKey {
  woodType?: string;
  size?: number;
  quality?: 'standard' | 'highQuality';
  textureType?: string;
  color?: string;
  [key: string]: any; // Allow additional parameters
}

/**
 * Global texture cache using LRU (Least Recently Used) eviction policy
 * Singleton pattern ensures single cache instance across application
 */
class TextureCache {
  private cache: Map<string, CacheEntry>;
  private maxEntries: number;
  private stats: CacheStats;

  constructor(maxEntries: number = 50) {
    this.cache = new Map();
    this.maxEntries = maxEntries;
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalMemoryUsage: 0,
      entryCount: 0,
    };
  }

  /**
   * Generate a unique cache key from texture parameters
   * @param params Texture parameters
   * @returns Unique cache key string
   */
  generateKey(params: TextureCacheKey): string {
    // Sort keys to ensure consistent key generation
    const sortedKeys = Object.keys(params).sort();
    const keyParts = sortedKeys.map(key => `${key}:${params[key]}`);
    return keyParts.join('|');
  }

  /**
   * Get a cached texture by key
   * @param key Cache key
   * @returns Cached texture or undefined if not found
   */
  getCachedTexture(key: string): THREE.Texture | undefined {
    const entry = this.cache.get(key);
    
    if (entry) {
      // Update last accessed time for LRU
      entry.lastAccessed = Date.now();
      this.cache.set(key, entry);
      
      // Update statistics
      this.stats.hits++;
      this.updateHitRate();
      
      return entry.texture;
    }
    
    // Cache miss
    this.stats.misses++;
    this.updateHitRate();
    
    return undefined;
  }

  /**
   * Set a texture in the cache
   * @param key Cache key
   * @param texture Texture to cache
   */
  setCachedTexture(key: string, texture: THREE.Texture): void {
    // Check if we need to evict entries
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictLRU();
    }

    // Calculate estimated memory size
    const size = this.estimateTextureSize(texture);

    // Create cache entry
    const entry: CacheEntry = {
      texture,
      key,
      size,
      lastAccessed: Date.now(),
    };

    // Add to cache
    this.cache.set(key, entry);

    // Update statistics
    this.stats.totalMemoryUsage += size;
    this.stats.entryCount = this.cache.size;
  }

  /**
   * Evict the least recently used entry from cache
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    // Find the least recently used entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    // Evict the oldest entry
    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      if (entry) {
        // Dispose of the texture to free GPU memory
        entry.texture.dispose();
        
        // Update statistics
        this.stats.totalMemoryUsage -= entry.size;
        
        // Remove from cache
        this.cache.delete(oldestKey);
        this.stats.entryCount = this.cache.size;
      }
    }
  }

  /**
   * Estimate the memory size of a texture in bytes
   * @param texture Texture to estimate
   * @returns Estimated size in bytes
   */
  private estimateTextureSize(texture: THREE.Texture): number {
    const image = texture.image as any;
    
    if (!image) {
      return 0;
    }

    // Get dimensions
    const width = (image.width as number) || 512;
    const height = (image.height as number) || 512;

    // Estimate bytes per pixel (RGBA = 4 bytes)
    const bytesPerPixel = 4;

    // Calculate base size
    let size = width * height * bytesPerPixel;

    // Account for mipmaps (adds ~33% more memory)
    if (texture.generateMipmaps) {
      size *= 1.33;
    }

    return Math.round(size);
  }

  /**
   * Update the cache hit rate statistic
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Get current cache statistics
   * @returns Cache statistics object
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    // Dispose all textures
    for (const entry of this.cache.values()) {
      entry.texture.dispose();
    }

    // Clear cache
    this.cache.clear();

    // Reset statistics
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalMemoryUsage: 0,
      entryCount: 0,
    };
  }

  /**
   * Remove a specific entry from the cache
   * @param key Cache key to remove
   */
  remove(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.texture.dispose();
      this.stats.totalMemoryUsage -= entry.size;
      this.cache.delete(key);
      this.stats.entryCount = this.cache.size;
    }
  }

  /**
   * Get the current number of cached entries
   * @returns Number of entries in cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if a key exists in the cache
   * @param key Cache key to check
   * @returns True if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get all cache keys
   * @returns Array of cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Singleton instance
let textureCacheInstance: TextureCache | null = null;

/**
 * Get the global texture cache singleton instance
 * @param maxEntries Maximum number of textures to cache (default: 50)
 * @returns TextureCache singleton instance
 */
export function getTextureCache(maxEntries: number = 50): TextureCache {
  if (!textureCacheInstance) {
    textureCacheInstance = new TextureCache(maxEntries);
  }
  return textureCacheInstance;
}

/**
 * Reset the texture cache singleton (useful for testing)
 */
export function resetTextureCache(): void {
  if (textureCacheInstance) {
    textureCacheInstance.clear();
    textureCacheInstance = null;
  }
}
