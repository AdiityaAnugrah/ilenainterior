/**
 * FrustumCuller - Frustum culling optimization for Three.js scenes
 * 
 * Implements frustum culling to skip rendering objects outside the camera viewport.
 * Uses Three.js Frustum and Matrix4 for efficient culling calculations.
 * 
 * Requirements: 1.8, 1.9
 */

import * as THREE from 'three';

export interface CullingStats {
  totalObjects: number;
  visibleObjects: number;
  culledObjects: number;
  cullingTime: number;
  lastUpdate: number;
}

export interface FrustumCullerConfig {
  updateInterval: number; // Update frustum every N frames (default: 5)
  enableStats: boolean;
  enableBoundingSphere: boolean; // Use bounding sphere for faster tests
  cullingMargin: number; // Margin to expand frustum (default: 0)
}

const DEFAULT_CONFIG: FrustumCullerConfig = {
  updateInterval: 5,
  enableStats: true,
  enableBoundingSphere: true,
  cullingMargin: 0,
};

export class FrustumCuller {
  private config: FrustumCullerConfig;
  private frustum: THREE.Frustum;
  private projScreenMatrix: THREE.Matrix4;
  private stats: CullingStats;
  private frameCount: number;
  private boundingSphere: THREE.Sphere;
  private boundingBox: THREE.Box3;

  constructor(config?: Partial<FrustumCullerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.frustum = new THREE.Frustum();
    this.projScreenMatrix = new THREE.Matrix4();
    this.boundingSphere = new THREE.Sphere();
    this.boundingBox = new THREE.Box3();
    this.frameCount = 0;

    this.stats = {
      totalObjects: 0,
      visibleObjects: 0,
      culledObjects: 0,
      cullingTime: 0,
      lastUpdate: 0,
    };
  }

  /**
   * Update frustum from camera projection and view matrices
   */
  updateFrustum(camera: THREE.Camera): void {
    // Combine camera projection matrix and matrix world
    this.projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );

    // Set frustum from combined matrix
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
  }

  /**
   * Check if object is within camera frustum
   */
  isObjectVisible(object: THREE.Object3D): boolean {
    // Skip if object is not visible
    if (!object.visible) {
      return false;
    }

    // Use bounding sphere for fast culling test
    if (this.config.enableBoundingSphere) {
      // Compute bounding sphere if not already computed
      if (object instanceof THREE.Mesh && object.geometry) {
        if (!object.geometry.boundingSphere) {
          object.geometry.computeBoundingSphere();
        }

        if (object.geometry.boundingSphere) {
          // Transform bounding sphere to world space
          this.boundingSphere.copy(object.geometry.boundingSphere);
          this.boundingSphere.applyMatrix4(object.matrixWorld);

          // Expand sphere by margin
          if (this.config.cullingMargin > 0) {
            this.boundingSphere.radius += this.config.cullingMargin;
          }

          // Test against frustum
          return this.frustum.intersectsSphere(this.boundingSphere);
        }
      }
    }

    // Fallback to bounding box test
    if (object instanceof THREE.Mesh && object.geometry) {
      if (!object.geometry.boundingBox) {
        object.geometry.computeBoundingBox();
      }

      if (object.geometry.boundingBox) {
        // Transform bounding box to world space
        this.boundingBox.copy(object.geometry.boundingBox);
        this.boundingBox.applyMatrix4(object.matrixWorld);

        // Expand box by margin
        if (this.config.cullingMargin > 0) {
          this.boundingBox.expandByScalar(this.config.cullingMargin);
        }

        // Test against frustum
        return this.frustum.intersectsBox(this.boundingBox);
      }
    }

    // If no geometry or bounding volume, assume visible
    return true;
  }

  /**
   * Perform frustum culling on scene objects
   * Returns true if culling was performed (based on update interval)
   */
  cullScene(scene: THREE.Scene, camera: THREE.Camera): boolean {
    this.frameCount++;

    // Only update frustum every N frames to reduce overhead
    if (this.frameCount % this.config.updateInterval !== 0) {
      return false;
    }

    const startTime = performance.now();

    // Update frustum from camera
    this.updateFrustum(camera);

    // Reset stats
    let totalObjects = 0;
    let visibleObjects = 0;
    let culledObjects = 0;

    // Traverse scene and update visibility
    scene.traverse((object) => {
      // Skip non-mesh objects (lights, cameras, helpers, etc.)
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      // Skip objects without geometry
      if (!object.geometry) {
        return;
      }

      totalObjects++;

      // Check if object is within frustum
      const isVisible = this.isObjectVisible(object);

      // Update object visibility
      object.visible = isVisible;

      if (isVisible) {
        visibleObjects++;
      } else {
        culledObjects++;
      }
    });

    // Update stats
    if (this.config.enableStats) {
      const cullingTime = performance.now() - startTime;
      this.stats = {
        totalObjects,
        visibleObjects,
        culledObjects,
        cullingTime,
        lastUpdate: Date.now(),
      };
    }

    return true;
  }

  /**
   * Perform frustum culling on specific objects (e.g., furniture items)
   */
  cullObjects(objects: THREE.Object3D[], camera: THREE.Camera): void {
    this.frameCount++;

    // Only update frustum every N frames to reduce overhead
    if (this.frameCount % this.config.updateInterval !== 0) {
      return;
    }

    const startTime = performance.now();

    // Update frustum from camera
    this.updateFrustum(camera);

    // Reset stats
    let totalObjects = 0;
    let visibleObjects = 0;
    let culledObjects = 0;

    // Check each object
    objects.forEach((object) => {
      totalObjects++;

      // Check if object is within frustum
      const isVisible = this.isObjectVisible(object);

      // Update object visibility
      object.visible = isVisible;

      if (isVisible) {
        visibleObjects++;
      } else {
        culledObjects++;
      }
    });

    // Update stats
    if (this.config.enableStats) {
      const cullingTime = performance.now() - startTime;
      this.stats = {
        totalObjects,
        visibleObjects,
        culledObjects,
        cullingTime,
        lastUpdate: Date.now(),
      };
    }
  }

  /**
   * Get culling statistics
   */
  getStats(): CullingStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalObjects: 0,
      visibleObjects: 0,
      culledObjects: 0,
      cullingTime: 0,
      lastUpdate: 0,
    };
  }

  /**
   * Get culling efficiency (percentage of objects culled)
   */
  getCullingEfficiency(): number {
    if (this.stats.totalObjects === 0) {
      return 0;
    }
    return (this.stats.culledObjects / this.stats.totalObjects) * 100;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FrustumCullerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Reset frame count (useful for testing)
   */
  resetFrameCount(): void {
    this.frameCount = 0;
  }
}

// Export singleton instance for convenience
let globalCuller: FrustumCuller | null = null;

export function getGlobalFrustumCuller(
  config?: Partial<FrustumCullerConfig>
): FrustumCuller {
  if (!globalCuller) {
    globalCuller = new FrustumCuller(config);
  }
  return globalCuller;
}

export function resetGlobalFrustumCuller(): void {
  globalCuller = null;
}
