import * as THREE from 'three';

/**
 * Resource reference interface for tracking Three.js resources
 */
export interface ResourceReference {
  id: string;
  type: 'texture' | 'geometry' | 'material' | 'mesh';
  resource: THREE.Texture | THREE.BufferGeometry | THREE.Material | THREE.Mesh;
  size: number;
  lastUsed: number;
  refCount: number;
}

/**
 * Configuration for MemoryManager
 */
export interface MemoryManagerConfig {
  maxMemoryUsage: number; // in MB
  cleanupThreshold: number; // percentage (0-100)
  checkInterval: number; // in ms
  enableAutoCleanup: boolean;
}

/**
 * MemoryManager class for managing disposal of textures and geometries
 * Implements LRU cache and automatic cleanup to prevent memory leaks
 */
export class MemoryManager {
  private config: MemoryManagerConfig;
  private resources: Map<string, ResourceReference>;
  private cleanupTimer: NodeJS.Timeout | null;

  constructor(config: Partial<MemoryManagerConfig> = {}) {
    this.config = {
      maxMemoryUsage: config.maxMemoryUsage ?? 200, // 200MB default
      cleanupThreshold: config.cleanupThreshold ?? 80, // 80% default
      checkInterval: config.checkInterval ?? 10000, // 10 seconds default
      enableAutoCleanup: config.enableAutoCleanup ?? true,
    };

    this.resources = new Map();
    this.cleanupTimer = null;

    if (this.config.enableAutoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Register a resource for tracking
   */
  register(
    id: string,
    resource: ResourceReference['resource'],
    type: ResourceReference['type']
  ): void {
    if (this.resources.has(id)) {
      console.warn(`Resource ${id} is already registered`);
      return;
    }

    const size = this.estimateResourceSize(resource, type);
    const resourceRef: ResourceReference = {
      id,
      type,
      resource,
      size,
      lastUsed: Date.now(),
      refCount: 1,
    };

    this.resources.set(id, resourceRef);
  }

  /**
   * Convenience method to register a texture
   */
  registerTexture(id: string, texture: THREE.Texture): void {
    this.register(id, texture, 'texture');
  }

  /**
   * Convenience method to register a geometry
   */
  registerGeometry(id: string, geometry: THREE.BufferGeometry): void {
    this.register(id, geometry, 'geometry');
  }

  /**
   * Convenience method to register a material
   */
  registerMaterial(id: string, material: THREE.Material): void {
    this.register(id, material, 'material');
  }

  /**
   * Convenience method to register a mesh
   */
  registerMesh(id: string, mesh: THREE.Mesh): void {
    this.register(id, mesh, 'mesh');
  }

  /**
   * Unregister a resource from tracking
   */
  unregister(id: string): void {
    const resourceRef = this.resources.get(id);
    if (!resourceRef) {
      return;
    }

    // Dispose the resource if ref count is 0
    if (resourceRef.refCount <= 0) {
      this.disposeResource(resourceRef);
    }

    this.resources.delete(id);
  }

  /**
   * Increment reference count for a resource
   */
  addRef(id: string): void {
    const resourceRef = this.resources.get(id);
    if (!resourceRef) {
      console.warn(`Resource ${id} not found`);
      return;
    }

    resourceRef.refCount++;
    resourceRef.lastUsed = Date.now();
  }

  /**
   * Decrement reference count and dispose if count reaches 0
   */
  releaseRef(id: string): void {
    const resourceRef = this.resources.get(id);
    if (!resourceRef) {
      console.warn(`Resource ${id} not found`);
      return;
    }

    resourceRef.refCount--;

    // Auto-dispose when ref count reaches 0
    if (resourceRef.refCount <= 0) {
      this.dispose(id);
    }
  }

  /**
   * Dispose a specific resource
   */
  dispose(id: string): void {
    const resourceRef = this.resources.get(id);
    if (!resourceRef) {
      return;
    }

    this.disposeResource(resourceRef);
    this.resources.delete(id);
  }

  /**
   * Dispose all resources
   */
  disposeAll(): void {
    for (const [id] of this.resources) {
      this.dispose(id);
    }
    this.resources.clear();
  }

  /**
   * Dispose all resources of a specific type
   */
  disposeByType(type: ResourceReference['type']): void {
    const resourcesToDispose: string[] = [];

    for (const [id, resourceRef] of this.resources) {
      if (resourceRef.type === type) {
        resourcesToDispose.push(id);
      }
    }

    for (const id of resourcesToDispose) {
      this.dispose(id);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  startAutoCleanup(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.checkInterval);
  }

  /**
   * Stop automatic cleanup timer
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Manually trigger cleanup
   */
  triggerCleanup(): void {
    this.cleanup();
  }

  /**
   * Internal cleanup method - checks memory usage and triggers eviction if needed
   */
  private cleanup(): void {
    const totalMemory = this.getTotalMemoryUsage();
    const thresholdMemory = (this.config.maxMemoryUsage * this.config.cleanupThreshold) / 100;

    if (totalMemory > thresholdMemory) {
      console.warn(
        `Memory usage (${totalMemory.toFixed(2)}MB) exceeds threshold (${thresholdMemory.toFixed(2)}MB). Triggering cleanup...`
      );

      // Calculate target size (reduce to 60% of max)
      const targetSize = this.config.maxMemoryUsage * 0.6;
      this.evictLRU(targetSize);
    }
  }

  /**
   * Evict least recently used resources until target size is reached
   */
  private evictLRU(targetSize: number): void {
    // Sort resources by lastUsed (oldest first) and refCount (prefer 0 ref count)
    const sortedResources = Array.from(this.resources.entries()).sort(
      ([, a], [, b]) => {
        // Prioritize resources with 0 ref count
        if (a.refCount === 0 && b.refCount > 0) return -1;
        if (a.refCount > 0 && b.refCount === 0) return 1;

        // Then sort by lastUsed
        return a.lastUsed - b.lastUsed;
      }
    );

    let currentSize = this.getTotalMemoryUsage();
    let evictedCount = 0;

    for (const [id, resourceRef] of sortedResources) {
      if (currentSize <= targetSize) {
        break;
      }

      // Only evict resources with 0 ref count
      if (resourceRef.refCount === 0) {
        currentSize -= resourceRef.size;
        this.dispose(id);
        evictedCount++;
      }
    }

    console.log(
      `Evicted ${evictedCount} resources. Memory usage: ${currentSize.toFixed(2)}MB`
    );
  }

  /**
   * Get total memory usage in MB
   */
  getTotalMemoryUsage(): number {
    let total = 0;
    for (const resourceRef of this.resources.values()) {
      total += resourceRef.size;
    }
    return total;
  }

  /**
   * Get total resource count
   */
  getResourceCount(): number {
    return this.resources.size;
  }

  /**
   * Get resources by type
   */
  getResourcesByType(type: ResourceReference['type']): ResourceReference[] {
    const results: ResourceReference[] = [];
    for (const resourceRef of this.resources.values()) {
      if (resourceRef.type === type) {
        results.push(resourceRef);
      }
    }
    return results;
  }

  /**
   * Mark a resource as used (updates lastUsed timestamp)
   */
  markAsUsed(id: string): void {
    const resourceRef = this.resources.get(id);
    if (resourceRef) {
      resourceRef.lastUsed = Date.now();
    }
  }

  /**
   * Check if a resource is registered
   */
  isRegistered(id: string): boolean {
    return this.resources.has(id);
  }

  /**
   * Dispose a resource and release GPU/CPU memory
   */
  private disposeResource(resourceRef: ResourceReference): void {
    const { resource, type } = resourceRef;

    try {
      switch (type) {
        case 'texture':
          if (resource instanceof THREE.Texture) {
            resource.dispose();
          }
          break;

        case 'geometry':
          if (resource instanceof THREE.BufferGeometry) {
            resource.dispose();
          }
          break;

        case 'material':
          if (resource instanceof THREE.Material) {
            resource.dispose();
          }
          break;

        case 'mesh':
          if (resource instanceof THREE.Mesh) {
            // Dispose geometry
            if (resource.geometry) {
              resource.geometry.dispose();
            }

            // Dispose material(s)
            if (Array.isArray(resource.material)) {
              resource.material.forEach((mat) => mat.dispose());
            } else if (resource.material) {
              resource.material.dispose();
            }
          }
          break;
      }
    } catch (error) {
      console.error(`Error disposing resource ${resourceRef.id}:`, error);
    }
  }

  /**
   * Estimate memory size of a resource in MB
   */
  private estimateResourceSize(
    resource: ResourceReference['resource'],
    type: ResourceReference['type']
  ): number {
    let sizeInBytes = 0;

    try {
      switch (type) {
        case 'texture':
          if (resource instanceof THREE.Texture && resource.image) {
            const image = resource.image;
            let width = 512;
            let height = 512;
            
            // Check for different image types
            if (typeof image === 'object' && image !== null && 'width' in image && 'height' in image) {
              width = (image as { width: number; height: number }).width || 512;
              height = (image as { width: number; height: number }).height || 512;
            }
            
            // Estimate: width * height * 4 bytes (RGBA)
            sizeInBytes = width * height * 4;
          }
          break;

        case 'geometry':
          if (resource instanceof THREE.BufferGeometry) {
            // Sum up all attribute sizes
            const attributes = resource.attributes;
            for (const key in attributes) {
              const attribute = attributes[key];
              if (attribute && attribute.array) {
                sizeInBytes += attribute.array.byteLength;
              }
            }

            // Add index size if present
            if (resource.index && resource.index.array) {
              sizeInBytes += resource.index.array.byteLength;
            }
          }
          break;

        case 'material':
          // Materials are relatively small, estimate 1KB
          sizeInBytes = 1024;
          break;

        case 'mesh':
          if (resource instanceof THREE.Mesh) {
            // Estimate geometry size
            if (resource.geometry) {
              sizeInBytes += this.estimateResourceSize(resource.geometry, 'geometry');
            }

            // Estimate material size
            if (Array.isArray(resource.material)) {
              sizeInBytes += resource.material.length * 1024;
            } else if (resource.material) {
              sizeInBytes += 1024;
            }
          }
          break;
      }
    } catch (error) {
      console.error(`Error estimating size for resource:`, error);
      // Default estimate: 1MB
      sizeInBytes = 1024 * 1024;
    }

    // Convert to MB
    return sizeInBytes / (1024 * 1024);
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    totalMemoryUsage: number;
    resourceCount: number;
    resourcesByType: Record<string, number>;
    maxMemoryUsage: number;
    cleanupThreshold: number;
  } {
    const resourcesByType: Record<string, number> = {
      texture: 0,
      geometry: 0,
      material: 0,
      mesh: 0,
    };

    for (const resourceRef of this.resources.values()) {
      resourcesByType[resourceRef.type]++;
    }

    return {
      totalMemoryUsage: this.getTotalMemoryUsage(),
      resourceCount: this.getResourceCount(),
      resourcesByType,
      maxMemoryUsage: this.config.maxMemoryUsage,
      cleanupThreshold: this.config.cleanupThreshold,
    };
  }

  /**
   * Cleanup and stop all timers (call when destroying the manager)
   */
  destroy(): void {
    this.stopAutoCleanup();
    this.disposeAll();
  }
}

// Export singleton instance
let memoryManagerInstance: MemoryManager | null = null;

export function getMemoryManager(config?: Partial<MemoryManagerConfig>): MemoryManager {
  if (!memoryManagerInstance) {
    memoryManagerInstance = new MemoryManager(config);
  }
  return memoryManagerInstance;
}

export function resetMemoryManager(): void {
  if (memoryManagerInstance) {
    memoryManagerInstance.destroy();
    memoryManagerInstance = null;
  }
}
