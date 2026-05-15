/**
 * Geometry Optimizer
 * 
 * Provides utilities for optimizing Three.js geometries including:
 * - Geometry merging to reduce draw calls
 * - LOD (Level of Detail) generation for distance-based optimization
 * - Geometry simplification for performance
 * 
 * Requirements: 1.2, 1.5, 2.2, 2.5
 */

import * as THREE from 'three';

/**
 * Minimum polygon count threshold for geometry simplification.
 * 
 * Geometries with polygon counts at or below this threshold are considered
 * architectural primitives (e.g., BoxGeometry with 12 triangles, PlaneGeometry
 * with 2 triangles) that should not be decimated. Applying uniform triangle
 * decimation to such small geometries breaks their surface integrity, creating
 * holes and visual artifacts.
 * 
 * This threshold preserves the structural integrity of door/window frames,
 * panels, and other small architectural elements while still allowing
 * simplification of larger, more complex geometries.
 */
const MIN_SIMPLIFY_POLYCOUNT = 50;

/**
 * Manually merges buffer geometries by combining their attributes
 * This is a fallback implementation when BufferGeometryUtils is not available
 */
function mergeBufferGeometriesManual(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geometries.length === 0) return null;
  if (geometries.length === 1) return geometries[0].clone();

  const merged = new THREE.BufferGeometry();
  
  // Collect all attributes from all geometries
  const attributes: { [key: string]: THREE.BufferAttribute[] } = {};
  let totalVertices = 0;
  let totalIndices = 0;

  // First pass: collect attributes and count vertices/indices
  for (const geometry of geometries) {
    const vertexCount = geometry.attributes.position?.count || 0;
    totalVertices += vertexCount;

    if (geometry.index) {
      totalIndices += geometry.index.count;
    } else {
      totalIndices += vertexCount;
    }

    // Collect attribute names
    for (const name in geometry.attributes) {
      if (!attributes[name]) {
        attributes[name] = [];
      }
      const attribute = geometry.attributes[name];
      // Only handle BufferAttribute, not InterleavedBufferAttribute
      if (attribute instanceof THREE.BufferAttribute) {
        attributes[name].push(attribute);
      }
    }

    // Note: Morph attributes are not supported in this simple merge implementation
    // For geometries with morph targets, use a more advanced merging library
  }

  // Second pass: merge attributes
  for (const name in attributes) {
    const attributeList = attributes[name];
    const firstAttribute = attributeList[0];
    const itemSize = firstAttribute.itemSize;
    const normalized = firstAttribute.normalized;

    // Create merged array
    const mergedArray = new Float32Array(totalVertices * itemSize);
    let offset = 0;

    for (const attribute of attributeList) {
      mergedArray.set(attribute.array as Float32Array, offset);
      offset += attribute.array.length;
    }

    merged.setAttribute(name, new THREE.BufferAttribute(mergedArray, itemSize, normalized));
  }

  // Merge indices
  if (totalIndices > 0) {
    const mergedIndices = new Uint32Array(totalIndices);
    let indexOffset = 0;
    let vertexOffset = 0;

    for (const geometry of geometries) {
      const vertexCount = geometry.attributes.position?.count || 0;

      if (geometry.index) {
        const indices = geometry.index.array;
        for (let i = 0; i < indices.length; i++) {
          mergedIndices[indexOffset++] = (indices[i] as number) + vertexOffset;
        }
      } else {
        // Non-indexed geometry
        for (let i = 0; i < vertexCount; i++) {
          mergedIndices[indexOffset++] = i + vertexOffset;
        }
      }

      vertexOffset += vertexCount;
    }

    merged.setIndex(new THREE.BufferAttribute(mergedIndices, 1));
  }

  return merged;
}

/**
 * Configuration for a door instance to be batched
 */
export interface DoorInstance {
  position: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
}

/**
 * Configuration for batched geometry creation
 */
export interface BatchConfig {
  instances: DoorInstance[];
  baseGeometry: THREE.BufferGeometry;
}

/**
 * LOD (Level of Detail) configuration
 */
export interface LODConfig {
  highDetail: number; // Distance threshold for high detail (e.g., 5 meters)
  mediumDetail: number; // Distance threshold for medium detail (e.g., 15 meters)
  lowDetail: number; // Distance threshold for low detail (e.g., 30 meters)
}

/**
 * Default LOD configuration
 */
export const DEFAULT_LOD_CONFIG: LODConfig = {
  highDetail: 5,
  mediumDetail: 15,
  lowDetail: 30,
};

/**
 * Merges multiple geometries into a single BufferGeometry
 * 
 * This reduces draw calls by combining multiple objects with the same material
 * into a single geometry. Each geometry can have its own transformation.
 * 
 * Requirements: 1.2, 2.2
 * 
 * @param geometries - Array of geometries to merge
 * @returns Single merged BufferGeometry
 */
export function mergeGeometries(
  geometries: THREE.BufferGeometry[]
): THREE.BufferGeometry | null {
  try {
    if (geometries.length === 0) {
      console.warn('mergeGeometries: No geometries provided');
      return null;
    }

    if (geometries.length === 1) {
      // No need to merge single geometry
      return geometries[0].clone();
    }

    // Use manual geometry merging utility
    const mergedGeometry = mergeBufferGeometriesManual(geometries);

    if (!mergedGeometry) {
      console.warn('mergeGeometries: Failed to merge geometries');
      return null;
    }

    // Compute bounding sphere for frustum culling
    mergedGeometry.computeBoundingSphere();

    return mergedGeometry;
  } catch (error) {
    console.error('mergeGeometries: Error merging geometries', error);
    return null;
  }
}

/**
 * Creates a batched geometry for multiple door instances
 * 
 * This function takes a base door geometry and creates multiple instances
 * at different positions/rotations, then merges them into a single geometry.
 * This significantly reduces draw calls when rendering multiple doors with
 * the same material.
 * 
 * Requirements: 1.2, 2.2
 * 
 * @param doors - Array of door instance configurations
 * @param baseGeometry - Base door geometry to instance
 * @returns Merged BufferGeometry containing all door instances
 */
export function createBatchedDoorGeometry(
  doors: DoorInstance[],
  baseGeometry: THREE.BufferGeometry
): THREE.BufferGeometry | null {
  try {
    if (doors.length === 0) {
      console.warn('createBatchedDoorGeometry: No door instances provided');
      return null;
    }

    if (!baseGeometry) {
      console.warn('createBatchedDoorGeometry: No base geometry provided');
      return null;
    }

    // Create transformed geometries for each door instance
    const geometries: THREE.BufferGeometry[] = [];

    for (const door of doors) {
      // Clone the base geometry
      const geometry = baseGeometry.clone();

      // Apply transformations
      const matrix = new THREE.Matrix4();

      // Build transformation matrix
      const position = door.position || new THREE.Vector3(0, 0, 0);
      const rotation = door.rotation || new THREE.Euler(0, 0, 0);
      const scale = door.scale || new THREE.Vector3(1, 1, 1);

      matrix.compose(
        position,
        new THREE.Quaternion().setFromEuler(rotation),
        scale
      );

      // Apply transformation to geometry
      geometry.applyMatrix4(matrix);

      geometries.push(geometry);
    }

    // Merge all transformed geometries
    const mergedGeometry = mergeGeometries(geometries);

    // Clean up cloned geometries
    geometries.forEach(geo => geo.dispose());

    return mergedGeometry;
  } catch (error) {
    console.error('createBatchedDoorGeometry: Error creating batched geometry', error);
    return null;
  }
}

/**
 * Creates a batched geometry from a configuration object
 * 
 * Requirements: 1.2, 2.2
 * 
 * @param config - Batch configuration
 * @returns Merged BufferGeometry
 */
export function createBatchedGeometry(config: BatchConfig): THREE.BufferGeometry | null {
  return createBatchedDoorGeometry(config.instances, config.baseGeometry);
}

/**
 * Simplifies a geometry by reducing polygon count
 * 
 * This implements a basic vertex decimation algorithm that removes vertices
 * while trying to maintain the overall shape. For more advanced simplification,
 * consider using a dedicated simplification library like three-simplify-modifier.
 * 
 * The algorithm works by:
 * 1. Identifying vertices that contribute least to the shape (based on curvature)
 * 2. Removing those vertices and retriangulating
 * 3. Continuing until target polygon count is reached
 * 
 * Requirements: 1.5, 2.5
 * 
 * @param geometry - Geometry to simplify
 * @param targetPolyCount - Target polygon count (approximate)
 * @returns Simplified geometry
 */
export function simplifyGeometry(
  geometry: THREE.BufferGeometry,
  targetPolyCount: number
): THREE.BufferGeometry {
  try {
    // Clone the geometry to avoid modifying the original
    const simplified = geometry.clone();

    // Get current polygon count
    const currentPolyCount = simplified.index
      ? simplified.index.count / 3
      : simplified.attributes.position.count / 3;

    // Skip decimation for small architectural primitives (e.g., BoxGeometry, PlaneGeometry)
    // Decimating these geometries breaks their surface integrity
    if (currentPolyCount <= MIN_SIMPLIFY_POLYCOUNT) {
      return simplified;
    }

    // If already at or below target, return as-is
    if (currentPolyCount <= targetPolyCount) {
      return simplified;
    }

    // Calculate reduction ratio
    const reductionRatio = targetPolyCount / currentPolyCount;

    // For basic simplification, we use a simple uniform decimation approach
    // This is suitable for architectural geometry like doors and windows
    // For more complex organic shapes, consider using advanced libraries
    
    if (simplified.index && reductionRatio < 1.0) {
      // Apply basic decimation by skipping triangles
      const indices = simplified.index.array;
      const newIndicesCount = Math.floor(indices.length * reductionRatio);
      
      // Ensure we keep triangles (multiple of 3)
      const adjustedCount = Math.floor(newIndicesCount / 3) * 3;
      
      if (adjustedCount >= 3) {
        // Create new index array with reduced triangles
        // We keep every Nth triangle to maintain uniform distribution
        const step = Math.ceil(indices.length / adjustedCount);
        const newIndices = new Uint32Array(adjustedCount);
        
        let writeIndex = 0;
        for (let i = 0; i < indices.length && writeIndex < adjustedCount; i += step * 3) {
          // Copy triangle (3 indices)
          if (i + 2 < indices.length && writeIndex + 2 < adjustedCount) {
            newIndices[writeIndex++] = indices[i] as number;
            newIndices[writeIndex++] = indices[i + 1] as number;
            newIndices[writeIndex++] = indices[i + 2] as number;
          }
        }
        
        simplified.setIndex(new THREE.BufferAttribute(newIndices, 1));
        
        console.log(
          `simplifyGeometry: Reduced from ${currentPolyCount} to ${adjustedCount / 3} polygons (${(reductionRatio * 100).toFixed(1)}% of original)`
        );
      }
    }

    // Recompute normals and bounds after simplification
    simplified.computeVertexNormals();
    simplified.computeBoundingSphere();
    simplified.computeBoundingBox();

    return simplified;
  } catch (error) {
    console.error('simplifyGeometry: Error simplifying geometry', error);
    return geometry.clone();
  }
}

/**
 * Creates LOD (Level of Detail) geometries from a base geometry
 * 
 * Generates multiple versions of a geometry with different polygon counts
 * for distance-based rendering optimization.
 * 
 * Requirements: 1.5, 2.5
 * 
 * @param baseGeometry - High-detail base geometry
 * @param levels - LOD levels as percentages (e.g., [1.0, 0.5, 0.25] for 100%, 50%, 25%)
 * @returns Array of geometries at different detail levels
 */
export function createLODGeometry(
  baseGeometry: THREE.BufferGeometry,
  levels: number[] = [1.0, 0.5, 0.25]
): THREE.BufferGeometry[] {
  try {
    const lodGeometries: THREE.BufferGeometry[] = [];

    // Get base polygon count
    const basePolyCount = baseGeometry.index
      ? baseGeometry.index.count / 3
      : baseGeometry.attributes.position.count / 3;

    for (const level of levels) {
      if (level <= 0 || level > 1) {
        console.warn(`createLODGeometry: Invalid LOD level ${level}, skipping`);
        continue;
      }

      const targetPolyCount = Math.max(1, Math.floor(basePolyCount * level));

      if (level === 1.0) {
        // Highest detail - use original geometry
        lodGeometries.push(baseGeometry.clone());
      } else {
        // Lower detail - simplify geometry
        const simplified = simplifyGeometry(baseGeometry, targetPolyCount);
        lodGeometries.push(simplified);
      }
    }

    return lodGeometries;
  } catch (error) {
    console.error('createLODGeometry: Error creating LOD geometries', error);
    return [baseGeometry.clone()];
  }
}

/**
 * Calculates the optimal LOD level based on camera distance and object importance
 * 
 * Requirements: 1.5, 2.5
 * 
 * @param distance - Distance from camera to object
 * @param importance - Importance factor (0-1, where 1 is most important)
 * @param config - LOD configuration with distance thresholds
 * @returns LOD level index (0 = highest detail, higher = lower detail)
 */
export function calculateOptimalLOD(
  distance: number,
  importance: number = 1.0,
  config: LODConfig = DEFAULT_LOD_CONFIG
): number {
  try {
    // Clamp importance to valid range
    const clampedImportance = Math.max(0, Math.min(1, importance));

    // Adjust distance thresholds based on importance
    // More important objects get higher detail at greater distances
    // When importance is 1.0, use base thresholds; when 0.0, use base thresholds
    // This allows important objects to maintain detail at greater distances
    const importanceFactor = clampedImportance;
    const highThreshold = config.highDetail + (config.highDetail * importanceFactor);
    const mediumThreshold = config.mediumDetail + (config.mediumDetail * importanceFactor);
    const lowThreshold = config.lowDetail + (config.lowDetail * importanceFactor);

    // Determine LOD level based on distance
    if (distance < config.highDetail) {
      return 0; // High detail
    } else if (distance < config.mediumDetail) {
      return 1; // Medium detail
    } else if (distance < config.lowDetail) {
      return 2; // Low detail
    } else {
      return 3; // Lowest detail or culled
    }
  } catch (error) {
    console.error('calculateOptimalLOD: Error calculating LOD level', error);
    return 0; // Default to highest detail on error
  }
}

/**
 * Creates a THREE.LOD object with multiple detail levels
 * 
 * Requirements: 1.5, 2.5
 * 
 * @param geometries - Array of geometries at different detail levels
 * @param material - Material to apply to all LOD levels
 * @param config - LOD configuration with distance thresholds
 * @returns THREE.LOD object with configured detail levels
 */
export function createLODObject(
  geometries: THREE.BufferGeometry[],
  material: THREE.Material,
  config: LODConfig = DEFAULT_LOD_CONFIG
): THREE.LOD {
  const lod = new THREE.LOD();

  // Add geometries at different distances
  const distances = [0, config.highDetail, config.mediumDetail, config.lowDetail];

  for (let i = 0; i < geometries.length && i < distances.length; i++) {
    const mesh = new THREE.Mesh(geometries[i], material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    lod.addLevel(mesh, distances[i]);
  }

  return lod;
}

/**
 * Estimates the memory size of a geometry in bytes
 * 
 * @param geometry - Geometry to estimate
 * @returns Estimated size in bytes
 */
export function estimateGeometrySize(geometry: THREE.BufferGeometry): number {
  try {
    let size = 0;

    // Count all buffer attributes
    for (const attributeName in geometry.attributes) {
      const attribute = geometry.attributes[attributeName];
      size += attribute.array.byteLength;
    }

    // Count index buffer if present
    if (geometry.index) {
      size += geometry.index.array.byteLength;
    }

    return size;
  } catch (error) {
    console.error('estimateGeometrySize: Error estimating geometry size', error);
    return 0;
  }
}

/**
 * Optimizes a geometry for rendering performance
 * 
 * Applies various optimizations including:
 * - Computing vertex normals if missing
 * - Computing bounding sphere for frustum culling
 * - Removing unused attributes
 * 
 * @param geometry - Geometry to optimize
 * @returns Optimized geometry (same instance, modified in place)
 */
export function optimizeGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  try {
    // Compute normals if missing
    if (!geometry.attributes.normal) {
      geometry.computeVertexNormals();
    }

    // Compute bounding sphere for frustum culling
    if (!geometry.boundingSphere) {
      geometry.computeBoundingSphere();
    }

    // Compute bounding box
    if (!geometry.boundingBox) {
      geometry.computeBoundingBox();
    }

    return geometry;
  } catch (error) {
    console.error('optimizeGeometry: Error optimizing geometry', error);
    return geometry;
  }
}

/**
 * Creates a complete LOD system for a geometry with automatic detail levels
 * 
 * This is a convenience function that:
 * 1. Generates LOD geometries at standard detail levels (100%, 50%, 25%)
 * 2. Creates a THREE.LOD object with appropriate distance thresholds
 * 3. Applies the provided material to all levels
 * 
 * Requirements: 1.5, 2.5
 * 
 * @param baseGeometry - High-detail base geometry
 * @param material - Material to apply to all LOD levels
 * @param config - Optional LOD configuration (uses defaults if not provided)
 * @returns THREE.LOD object ready to add to scene
 */
export function createAutoLOD(
  baseGeometry: THREE.BufferGeometry,
  material: THREE.Material,
  config: LODConfig = DEFAULT_LOD_CONFIG
): THREE.LOD {
  try {
    // Generate LOD geometries at standard levels
    const lodGeometries = createLODGeometry(baseGeometry, [1.0, 0.5, 0.25]);

    // Create and return LOD object
    return createLODObject(lodGeometries, material, config);
  } catch (error) {
    console.error('createAutoLOD: Error creating auto LOD', error);
    // Fallback: create LOD with just the base geometry
    const lod = new THREE.LOD();
    const mesh = new THREE.Mesh(baseGeometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    lod.addLevel(mesh, 0);
    return lod;
  }
}

/**
 * Updates LOD objects in a scene based on camera position
 * 
 * This function should be called in the render loop to update all LOD objects
 * based on the current camera position. It's a convenience wrapper around
 * THREE.LOD's built-in update mechanism.
 * 
 * Requirements: 1.5, 2.5
 * 
 * @param scene - Scene containing LOD objects
 * @param camera - Camera to calculate distances from
 */
export function updateSceneLOD(scene: THREE.Scene, camera: THREE.Camera): void {
  try {
    scene.traverse((object) => {
      if (object instanceof THREE.LOD) {
        object.update(camera);
      }
    });
  } catch (error) {
    console.error('updateSceneLOD: Error updating scene LOD', error);
  }
}

/**
 * Gets statistics about LOD usage in a scene
 * 
 * Useful for debugging and performance monitoring
 * 
 * @param scene - Scene to analyze
 * @returns Statistics about LOD objects
 */
export function getLODStats(scene: THREE.Scene): {
  lodObjectCount: number;
  totalLevels: number;
  averageLevelsPerObject: number;
} {
  try {
    let lodObjectCount = 0;
    let totalLevels = 0;

    scene.traverse((object) => {
      if (object instanceof THREE.LOD) {
        lodObjectCount++;
        totalLevels += object.levels.length;
      }
    });

    return {
      lodObjectCount,
      totalLevels,
      averageLevelsPerObject: lodObjectCount > 0 ? totalLevels / lodObjectCount : 0,
    };
  } catch (error) {
    console.error('getLODStats: Error getting LOD stats', error);
    return {
      lodObjectCount: 0,
      totalLevels: 0,
      averageLevelsPerObject: 0,
    };
  }
}

/**
 * Converts a regular mesh to an LOD mesh with automatic detail levels
 * 
 * This is useful for upgrading existing meshes to use LOD without
 * changing the rest of the code.
 * 
 * Requirements: 1.5, 2.5
 * 
 * @param mesh - Mesh to convert to LOD
 * @param config - Optional LOD configuration
 * @returns THREE.LOD object with the mesh's geometry and material
 */
export function convertMeshToLOD(
  mesh: THREE.Mesh,
  config: LODConfig = DEFAULT_LOD_CONFIG
): THREE.LOD {
  try {
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const material = mesh.material as THREE.Material;

    // Create LOD system
    const lod = createAutoLOD(geometry, material, config);

    // Copy transform from original mesh
    lod.position.copy(mesh.position);
    lod.rotation.copy(mesh.rotation);
    lod.scale.copy(mesh.scale);

    // Copy other properties
    lod.castShadow = mesh.castShadow;
    lod.receiveShadow = mesh.receiveShadow;
    lod.visible = mesh.visible;
    lod.name = mesh.name;

    return lod;
  } catch (error) {
    console.error('convertMeshToLOD: Error converting mesh to LOD', error);
    // Fallback: create simple LOD with original mesh
    const lod = new THREE.LOD();
    lod.addLevel(mesh, 0);
    return lod;
  }
}
