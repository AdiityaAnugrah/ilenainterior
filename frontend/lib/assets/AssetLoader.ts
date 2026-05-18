/**
 * AssetLoader - Lazy loading, progressive loading, and parallel loading of 3D models and textures
 * 
 * Features:
 * - Lazy loading (load on-demand)
 * - Progressive loading (low-res preview → high-res)
 * - Parallel loading (max 6 concurrent requests)
 * - Priority queue (critical → high → normal → low)
 * - Cache integration with CacheManager
 * - Timeout and retry with exponential backoff
 * - Progress tracking and performance monitoring
 */

import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { CacheManager } from '../cache/CacheManager';
import { PerformanceMonitor } from '../performance/PerformanceMonitor';

export type AssetPriority = 'critical' | 'high' | 'normal' | 'low';

export interface AssetLoadOptions {
  priority: AssetPriority;
  progressive: boolean;
  cache: boolean;
  timeout: number;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

export interface LoadedAsset<T> {
  data: T;
  size: number;
  loadTime: number;
  cached: boolean;
}

export interface AssetLoaderConfig {
  maxConcurrentRequests: number;
  defaultTimeout: number;
  enableProgressive: boolean;
  enableCache: boolean;
  cacheManager: CacheManager;
  performanceMonitor?: PerformanceMonitor;
}

interface QueueItem {
  url: string;
  options: AssetLoadOptions;
  resolve: (value: LoadedAsset<any>) => void;
  reject: (error: Error) => void;
  type: 'model' | 'texture';
  retryCount: number;
}

const DEFAULT_OPTIONS: AssetLoadOptions = {
  priority: 'normal',
  progressive: false,
  cache: true,
  timeout: 30000, // 30 seconds
};

const PRIORITY_ORDER: Record<AssetPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export class AssetLoader {
  private config: AssetLoaderConfig;
  private loadQueue: QueueItem[];
  private activeRequests: Set<string>;
  private textureLoader: THREE.TextureLoader;
  private gltfLoader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private abortControllers: Map<string, AbortController>;

  constructor(config: AssetLoaderConfig) {
    this.config = config;
    this.loadQueue = [];
    this.activeRequests = new Set();
    this.abortControllers = new Map();

    // Initialize loaders
    this.textureLoader = new THREE.TextureLoader();
    this.gltfLoader = new GLTFLoader();
    
    // Setup Draco loader for compressed models
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/'); // Use CDN for Draco decoder
    this.gltfLoader.setDRACOLoader(this.dracoLoader);

    // Setup Meshopt decoder for EXT_meshopt_compression
    // (admin upload pipeline applies Meshopt compression to GLBs)
    this.gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  }

  // ==================== Model Loading ====================

  /**
   * Load a 3D model (.glb)
   * @param url - URL to the model file
   * @param options - Load options
   * @returns Promise with loaded model
   */
  async loadModel(
    url: string,
    options?: Partial<AssetLoadOptions>
  ): Promise<LoadedAsset<GLTF>> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Check cache first
    if (opts.cache && this.config.enableCache) {
      const cached = this.config.cacheManager.get(url) as GLTF | null;
      if (cached) {
        if (this.config.performanceMonitor) {
          this.config.performanceMonitor.updateCacheStats(true);
        }
        return {
          data: cached,
          size: 0,
          loadTime: 0,
          cached: true,
        };
      }
      if (this.config.performanceMonitor) {
        this.config.performanceMonitor.updateCacheStats(false);
      }
    }

    // Add to queue or load immediately
    if (this.activeRequests.size >= this.config.maxConcurrentRequests) {
      return this.enqueueLoad<GLTF>(url, opts, 'model');
    }

    return this.loadModelInternal(url, opts);
  }

  /**
   * Load model with progressive loading (low-res → high-res)
   * @param url - URL to high-res model
   * @param lowResUrl - URL to low-res preview model
   * @param options - Load options
   * @returns Promise with loaded high-res model
   */
  async loadModelProgressive(
    url: string,
    lowResUrl: string,
    options?: Partial<AssetLoadOptions>
  ): Promise<LoadedAsset<GLTF>> {
    const opts = { ...DEFAULT_OPTIONS, progressive: true, ...options };

    // Load low-res first (don't wait)
    this.loadModel(lowResUrl, { ...opts, priority: 'high', cache: true }).catch((err) => {
      console.warn('[AssetLoader] Failed to load low-res preview:', err);
    });

    // Load high-res
    return this.loadModel(url, opts);
  }

  /**
   * Internal method to load model
   * @private
   */
  private async loadModelInternal(
    url: string,
    options: AssetLoadOptions,
    retryCount = 0
  ): Promise<LoadedAsset<GLTF>> {
    const startTime = performance.now();
    this.activeRequests.add(url);

    try {
      // Create abort controller for timeout
      const abortController = new AbortController();
      this.abortControllers.set(url, abortController);

      // Setup timeout
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, options.timeout);

      // Load model
      const gltf = await new Promise<GLTF>((resolve, reject) => {
        this.gltfLoader.load(
          url,
          (gltf) => {
            clearTimeout(timeoutId);
            resolve(gltf);
          },
          (progressEvent) => {
            if (options.onProgress && progressEvent.lengthComputable) {
              const progress = (progressEvent.loaded / progressEvent.total) * 100;
              options.onProgress(progress);
            }
          },
          (error) => {
            clearTimeout(timeoutId);
            reject(error);
          }
        );

        // Handle abort
        abortController.signal.addEventListener('abort', () => {
          reject(new Error(`Load timeout: ${url}`));
        });
      });

      const loadTime = performance.now() - startTime;

      // Estimate size
      const size = this.estimateModelSize(gltf);

      // Cache if enabled
      if (options.cache && this.config.enableCache) {
        this.config.cacheManager.set(url, gltf, 3600000); // Cache for 1 hour
      }

      // Track performance
      if (this.config.performanceMonitor) {
        this.config.performanceMonitor.trackAPICall(`model:${url}`, loadTime);
      }

      // Cleanup
      this.activeRequests.delete(url);
      this.abortControllers.delete(url);
      this.processQueue();

      return {
        data: gltf,
        size,
        loadTime,
        cached: false,
      };
    } catch (error) {
      // Cleanup
      this.activeRequests.delete(url);
      this.abortControllers.delete(url);

      // Retry with exponential backoff
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.warn(`[AssetLoader] Retrying model load (${retryCount + 1}/3): ${url}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.loadModelInternal(url, options, retryCount + 1);
      }

      // Max retries exceeded
      const err = error instanceof Error ? error : new Error(String(error));
      if (options.onError) {
        options.onError(err);
      }
      this.processQueue();
      throw err;
    }
  }

  // ==================== Texture Loading ====================

  /**
   * Load a texture
   * @param url - URL to the texture file
   * @param options - Load options
   * @returns Promise with loaded texture
   */
  async loadTexture(
    url: string,
    options?: Partial<AssetLoadOptions>
  ): Promise<LoadedAsset<THREE.Texture>> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Check cache first
    if (opts.cache && this.config.enableCache) {
      const cached = this.config.cacheManager.get(url) as THREE.Texture | null;
      if (cached) {
        if (this.config.performanceMonitor) {
          this.config.performanceMonitor.updateCacheStats(true);
        }
        return {
          data: cached,
          size: 0,
          loadTime: 0,
          cached: true,
        };
      }
      if (this.config.performanceMonitor) {
        this.config.performanceMonitor.updateCacheStats(false);
      }
    }

    // Add to queue or load immediately
    if (this.activeRequests.size >= this.config.maxConcurrentRequests) {
      return this.enqueueLoad<THREE.Texture>(url, opts, 'texture');
    }

    return this.loadTextureInternal(url, opts);
  }

  /**
   * Internal method to load texture
   * @private
   */
  private async loadTextureInternal(
    url: string,
    options: AssetLoadOptions,
    retryCount = 0
  ): Promise<LoadedAsset<THREE.Texture>> {
    const startTime = performance.now();
    this.activeRequests.add(url);

    try {
      // Create abort controller for timeout
      const abortController = new AbortController();
      this.abortControllers.set(url, abortController);

      // Setup timeout
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, options.timeout);

      // Load texture
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        this.textureLoader.load(
          url,
          (texture) => {
            clearTimeout(timeoutId);
            resolve(texture);
          },
          (progressEvent) => {
            if (options.onProgress && progressEvent.lengthComputable) {
              const progress = (progressEvent.loaded / progressEvent.total) * 100;
              options.onProgress(progress);
            }
          },
          (error) => {
            clearTimeout(timeoutId);
            reject(error);
          }
        );

        // Handle abort
        abortController.signal.addEventListener('abort', () => {
          reject(new Error(`Load timeout: ${url}`));
        });
      });

      const loadTime = performance.now() - startTime;

      // Estimate size
      const size = this.estimateTextureSize(texture);

      // Cache if enabled
      if (options.cache && this.config.enableCache) {
        this.config.cacheManager.set(url, texture, 3600000); // Cache for 1 hour
      }

      // Track performance
      if (this.config.performanceMonitor) {
        this.config.performanceMonitor.trackAPICall(`texture:${url}`, loadTime);
      }

      // Cleanup
      this.activeRequests.delete(url);
      this.abortControllers.delete(url);
      this.processQueue();

      return {
        data: texture,
        size,
        loadTime,
        cached: false,
      };
    } catch (error) {
      // Cleanup
      this.activeRequests.delete(url);
      this.abortControllers.delete(url);

      // Retry with exponential backoff
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.warn(`[AssetLoader] Retrying texture load (${retryCount + 1}/3): ${url}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.loadTextureInternal(url, options, retryCount + 1);
      }

      // Max retries exceeded
      const err = error instanceof Error ? error : new Error(String(error));
      if (options.onError) {
        options.onError(err);
      }
      this.processQueue();
      throw err;
    }
  }

  // ==================== Batch Loading ====================

  /**
   * Load multiple assets in parallel (respecting max concurrent limit)
   * @param urls - Array of URLs to load
   * @param loader - Loader function (loadModel or loadTexture)
   * @param options - Load options
   * @returns Promise with array of loaded assets
   */
  async loadBatch<T>(
    urls: string[],
    loader: (url: string, options?: Partial<AssetLoadOptions>) => Promise<LoadedAsset<T>>,
    options?: Partial<AssetLoadOptions>
  ): Promise<LoadedAsset<T>[]> {
    const promises = urls.map((url) => loader.call(this, url, options));
    return Promise.all(promises);
  }

  // ==================== Queue Management ====================

  /**
   * Add asset to load queue
   * @private
   */
  private enqueueLoad<T>(
    url: string,
    options: AssetLoadOptions,
    type: 'model' | 'texture'
  ): Promise<LoadedAsset<T>> {
    return new Promise((resolve, reject) => {
      const queueItem: QueueItem = {
        url,
        options,
        resolve,
        reject,
        type,
        retryCount: 0,
      };

      this.loadQueue.push(queueItem);
      this.sortQueue();
    });
  }

  /**
   * Sort queue by priority
   * @private
   */
  private sortQueue(): void {
    this.loadQueue.sort((a, b) => {
      return PRIORITY_ORDER[a.options.priority] - PRIORITY_ORDER[b.options.priority];
    });
  }

  /**
   * Process next item in queue
   * @private
   */
  private processQueue(): void {
    if (this.loadQueue.length === 0) return;
    if (this.activeRequests.size >= this.config.maxConcurrentRequests) return;

    const item = this.loadQueue.shift();
    if (!item) return;

    // Load based on type
    const loadPromise =
      item.type === 'model'
        ? this.loadModelInternal(item.url, item.options, item.retryCount)
        : this.loadTextureInternal(item.url, item.options, item.retryCount);

    loadPromise.then(item.resolve).catch(item.reject);
  }

  // ==================== Preloading ====================

  /**
   * Preload assets (add to queue with specified priority)
   * @param urls - Array of URLs to preload
   * @param priority - Priority level
   */
  preload(urls: string[], priority: AssetPriority = 'low'): void {
    urls.forEach((url) => {
      // Determine type from extension
      const isModel = url.endsWith('.glb') || url.endsWith('.gltf');
      
      if (isModel) {
        this.loadModel(url, { priority, cache: true }).catch((err) => {
          console.warn(`[AssetLoader] Preload failed for ${url}:`, err);
        });
      } else {
        this.loadTexture(url, { priority, cache: true }).catch((err) => {
          console.warn(`[AssetLoader] Preload failed for ${url}:`, err);
        });
      }
    });
  }

  // ==================== Utility ====================

  /**
   * Cancel loading of a specific asset
   * @param url - URL of asset to cancel
   */
  cancelLoad(url: string): void {
    // Remove from queue
    this.loadQueue = this.loadQueue.filter((item) => item.url !== url);

    // Abort active request
    const abortController = this.abortControllers.get(url);
    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(url);
    }

    this.activeRequests.delete(url);
    this.processQueue();
  }

  /**
   * Clear all queued loads
   */
  clearQueue(): void {
    this.loadQueue.forEach((item) => {
      item.reject(new Error('Queue cleared'));
    });
    this.loadQueue = [];
  }

  /**
   * Get loading progress (percentage of active requests)
   * @returns Progress percentage (0-100)
   */
  getLoadingProgress(): number {
    const total = this.activeRequests.size + this.loadQueue.length;
    if (total === 0) return 100;

    const completed = total - this.activeRequests.size - this.loadQueue.length;
    return Math.round((completed / total) * 100);
  }

  /**
   * Get number of active requests
   */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Get number of queued requests
   */
  getQueuedRequestCount(): number {
    return this.loadQueue.length;
  }

  /**
   * Check if asset is currently loading
   */
  isLoading(url: string): boolean {
    return this.activeRequests.has(url);
  }

  /**
   * Estimate model size in bytes
   * @private
   */
  private estimateModelSize(gltf: GLTF): number {
    let size = 0;

    gltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Geometry size
        if (object.geometry) {
          const geometry = object.geometry;
          for (const key in geometry.attributes) {
            const attribute = geometry.attributes[key];
            if (attribute.array) {
              size += attribute.array.byteLength;
            }
          }
          if (geometry.index) {
            size += geometry.index.array.byteLength;
          }
        }

        // Material textures size
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial) {
              if (material.map) size += this.estimateTextureSize(material.map);
              if (material.normalMap) size += this.estimateTextureSize(material.normalMap);
              if (material.roughnessMap) size += this.estimateTextureSize(material.roughnessMap);
              if (material.metalnessMap) size += this.estimateTextureSize(material.metalnessMap);
              if (material.aoMap) size += this.estimateTextureSize(material.aoMap);
            }
          });
        }
      }
    });

    return size;
  }

  /**
   * Estimate texture size in bytes
   * @private
   */
  private estimateTextureSize(texture: THREE.Texture): number {
    if (!texture.image) return 0;
    const image = texture.image as { width?: number; height?: number };
    const width = image.width || 1024;
    const height = image.height || 1024;
    return width * height * 4; // RGBA = 4 bytes per pixel
  }

  /**
   * Cleanup and dispose resources
   */
  destroy(): void {
    // Cancel all active loads
    this.abortControllers.forEach((controller) => controller.abort());
    this.abortControllers.clear();

    // Clear queue
    this.clearQueue();

    // Dispose loaders
    this.dracoLoader.dispose();

    this.activeRequests.clear();
  }
}

// Export factory function for easy instantiation
export function createAssetLoader(
  cacheManager: CacheManager,
  performanceMonitor?: PerformanceMonitor
): AssetLoader {
  return new AssetLoader({
    maxConcurrentRequests: 6,
    defaultTimeout: 30000,
    enableProgressive: true,
    enableCache: true,
    cacheManager,
    performanceMonitor,
  });
}
