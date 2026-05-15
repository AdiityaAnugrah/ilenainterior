import * as THREE from 'three';
import { mergeGeometries as mergeGeometriesUtil } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Configuration for geometry merging
 */
export interface MergeConfig {
  applyWorldTransforms?: boolean;
  preserveUVs?: boolean;
  preserveNormals?: boolean;
}

/**
 * Geometry merge result containing the merged geometry and metadata
 */
export interface MergeResult {
  geometry: THREE.BufferGeometry;
  vertexCount: number;
  triangleCount: number;
  boundingBox: THREE.Box3;
}

/**
 * Merge multiple geometries with their transforms into a single geometry
 * 
 * @param geometries - Array of geometries to merge
 * @param transforms - Array of transforms (position, rotation, scale) for each geometry
 * @param config - Merge configuration options
 * @returns Merged geometry result
 */
export function mergeGeometries(
  geometries: THREE.BufferGeometry[],
  transforms: Array<{
    position?: THREE.Vector3;
    rotation?: THREE.Euler;
    scale?: THREE.Vector3;
  }>,
  config: MergeConfig = {}
): MergeResult | null {
  if (geometries.length === 0) {
    console.warn('GeometryMerger: No geometries provided for merging');
    return null;
  }

  if (geometries.length !== transforms.length) {
    console.error('GeometryMerger: Geometries and transforms arrays must have the same length');
    return null;
  }

  const {
    applyWorldTransforms = true,
    preserveUVs = true,
    preserveNormals = true,
  } = config;

  try {
    // Clone and transform geometries
    const transformedGeometries: THREE.BufferGeometry[] = [];

    for (let i = 0; i < geometries.length; i++) {
      const geo = geometries[i].clone();
      const transform = transforms[i];

      if (applyWorldTransforms) {
        // Create transformation matrix
        const matrix = new THREE.Matrix4();
        
        const position = transform.position || new THREE.Vector3(0, 0, 0);
        const rotation = transform.rotation || new THREE.Euler(0, 0, 0);
        const scale = transform.scale || new THREE.Vector3(1, 1, 1);

        // Apply transformations
        matrix.compose(
          position,
          new THREE.Quaternion().setFromEuler(rotation),
          scale
        );

        geo.applyMatrix4(matrix);
      }

      // Ensure geometry has required attributes
      if (!geo.attributes.position) {
        console.warn(`GeometryMerger: Geometry ${i} missing position attribute, skipping`);
        continue;
      }

      // Compute normals if missing and preserveNormals is true
      if (preserveNormals && !geo.attributes.normal) {
        geo.computeVertexNormals();
      }

      transformedGeometries.push(geo);
    }

    if (transformedGeometries.length === 0) {
      console.warn('GeometryMerger: No valid geometries to merge after transformation');
      return null;
    }

    // Merge geometries using Three.js mergeGeometries utility
    const mergedGeometry = mergeGeometriesUtil(transformedGeometries, preserveUVs);

    if (!mergedGeometry) {
      console.error('GeometryMerger: Failed to merge geometries');
      return null;
    }

    // Compute bounding box
    mergedGeometry.computeBoundingBox();
    const boundingBox = mergedGeometry.boundingBox || new THREE.Box3();

    // Calculate statistics
    const vertexCount = mergedGeometry.attributes.position.count;
    const triangleCount = mergedGeometry.index
      ? mergedGeometry.index.count / 3
      : vertexCount / 3;

    // Dispose cloned geometries
    transformedGeometries.forEach(geo => geo.dispose());

    return {
      geometry: mergedGeometry,
      vertexCount,
      triangleCount,
      boundingBox,
    };
  } catch (error) {
    console.error('GeometryMerger: Error during geometry merging:', error);
    return null;
  }
}

/**
 * Merge geometries from LOD objects at a specific level
 * 
 * @param lodObjects - Array of LOD objects
 * @param lodLevel - LOD level to extract geometries from (0 = highest detail)
 * @param config - Merge configuration options
 * @returns Merged geometry result
 */
export function mergeLODGeometries(
  lodObjects: THREE.LOD[],
  lodLevel: number = 0,
  config: MergeConfig = {}
): MergeResult | null {
  const geometries: THREE.BufferGeometry[] = [];
  const transforms: Array<{
    position?: THREE.Vector3;
    rotation?: THREE.Euler;
    scale?: THREE.Vector3;
  }> = [];

  for (const lod of lodObjects) {
    if (lodLevel >= lod.levels.length) {
      console.warn(`GeometryMerger: LOD level ${lodLevel} not found in LOD object, using highest available`);
      lodLevel = lod.levels.length - 1;
    }

    const level = lod.levels[lodLevel];
    const mesh = level.object as THREE.Mesh;

    if (mesh && mesh.geometry) {
      geometries.push(mesh.geometry as THREE.BufferGeometry);
      
      // Get world transform from LOD object
      transforms.push({
        position: lod.position.clone(),
        rotation: lod.rotation.clone(),
        scale: lod.scale.clone(),
      });
    }
  }

  return mergeGeometries(geometries, transforms, config);
}

/**
 * Create a merged mesh from multiple geometries
 * 
 * @param geometries - Array of geometries to merge
 * @param transforms - Array of transforms for each geometry
 * @param material - Material to apply to the merged mesh
 * @param config - Merge configuration options
 * @returns Merged mesh or null if merge failed
 */
export function createMergedMesh(
  geometries: THREE.BufferGeometry[],
  transforms: Array<{
    position?: THREE.Vector3;
    rotation?: THREE.Euler;
    scale?: THREE.Vector3;
  }>,
  material: THREE.Material,
  config: MergeConfig = {}
): THREE.Mesh | null {
  const mergeResult = mergeGeometries(geometries, transforms, config);

  if (!mergeResult) {
    return null;
  }

  const mesh = new THREE.Mesh(mergeResult.geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = true;

  return mesh;
}

/**
 * Create a merged LOD object from multiple LOD objects
 * Merges geometries at each LOD level separately
 * 
 * @param lodObjects - Array of LOD objects to merge
 * @param material - Material to apply to merged meshes
 * @param lodDistances - Array of distances for each LOD level
 * @param config - Merge configuration options
 * @returns Merged LOD object or null if merge failed
 */
export function createMergedLOD(
  lodObjects: THREE.LOD[],
  material: THREE.Material,
  lodDistances: number[],
  config: MergeConfig = {}
): THREE.LOD | null {
  if (lodObjects.length === 0) {
    console.warn('GeometryMerger: No LOD objects provided for merging');
    return null;
  }

  const mergedLOD = new THREE.LOD();

  // Determine number of LOD levels (use minimum across all LOD objects)
  const numLevels = Math.min(...lodObjects.map(lod => lod.levels.length));

  for (let level = 0; level < numLevels; level++) {
    const mergeResult = mergeLODGeometries(lodObjects, level, config);

    if (!mergeResult) {
      console.warn(`GeometryMerger: Failed to merge LOD level ${level}, skipping`);
      continue;
    }

    const mesh = new THREE.Mesh(mergeResult.geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    const distance = lodDistances[level] || 0;
    mergedLOD.addLevel(mesh, distance);
  }

  if (mergedLOD.levels.length === 0) {
    console.error('GeometryMerger: Failed to create any LOD levels');
    return null;
  }

  return mergedLOD;
}
