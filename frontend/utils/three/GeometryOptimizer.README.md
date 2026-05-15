# GeometryOptimizer

Utility for optimizing Three.js geometries to reduce draw calls and improve rendering performance.

## Overview

The GeometryOptimizer provides functions for:
- **Geometry Merging**: Combine multiple geometries into a single buffer geometry to reduce draw calls
- **Batched Geometry Creation**: Create batched geometries for multiple instances (e.g., doors, windows)
- **LOD (Level of Detail)**: Generate and manage multiple detail levels based on camera distance
- **Geometry Optimization**: Compute normals, bounding spheres, and other optimizations

## Key Features

### 1. Geometry Merging

Merge multiple geometries into a single buffer geometry to reduce draw calls:

```typescript
import { mergeGeometries } from '@/utils/three/GeometryOptimizer';

const box1 = new THREE.BoxGeometry(1, 1, 1);
const box2 = new THREE.BoxGeometry(1, 1, 1);
const box3 = new THREE.BoxGeometry(1, 1, 1);

const merged = mergeGeometries([box1, box2, box3]);
// Result: Single geometry with all vertices combined
```

### 2. Batched Door Geometry

Create batched geometries for multiple door instances with transformations:

```typescript
import { createBatchedDoorGeometry } from '@/utils/three/GeometryOptimizer';

const baseGeometry = new THREE.BoxGeometry(1, 2, 0.1);

const doors = [
  { position: new THREE.Vector3(0, 0, 0) },
  { position: new THREE.Vector3(5, 0, 0), rotation: new THREE.Euler(0, Math.PI / 2, 0) },
  { position: new THREE.Vector3(10, 0, 0), scale: new THREE.Vector3(1.5, 1.5, 1.5) },
];

const batchedGeometry = createBatchedDoorGeometry(doors, baseGeometry);
// Result: Single geometry containing all door instances
// Benefit: 1 draw call instead of 3
```

### 3. Level of Detail (LOD)

Generate multiple detail levels and calculate optimal LOD based on distance:

```typescript
import { 
  createLODGeometry, 
  calculateOptimalLOD, 
  createLODObject,
  DEFAULT_LOD_CONFIG 
} from '@/utils/three/GeometryOptimizer';

// Generate LOD geometries
const baseGeometry = new THREE.BoxGeometry(1, 1, 1);
const lodGeometries = createLODGeometry(baseGeometry, [1.0, 0.5, 0.25]);
// Result: [high detail, medium detail, low detail]

// Calculate optimal LOD level
const distance = 10; // meters from camera
const importance = 1.0; // 0-1, where 1 is most important
const lodLevel = calculateOptimalLOD(distance, importance, DEFAULT_LOD_CONFIG);
// Result: 0 (high), 1 (medium), 2 (low), or 3 (lowest/culled)

// Create THREE.LOD object
const material = new THREE.MeshStandardMaterial();
const lodObject = createLODObject(lodGeometries, material, DEFAULT_LOD_CONFIG);
scene.add(lodObject);
```

### 4. Geometry Optimization

Optimize geometries for rendering:

```typescript
import { optimizeGeometry, estimateGeometrySize } from '@/utils/three/GeometryOptimizer';

const geometry = new THREE.BufferGeometry();
// ... set up geometry ...

// Optimize for rendering
optimizeGeometry(geometry);
// - Computes vertex normals if missing
// - Computes bounding sphere for frustum culling
// - Computes bounding box

// Estimate memory usage
const sizeInBytes = estimateGeometrySize(geometry);
console.log(`Geometry uses approximately ${sizeInBytes} bytes`);
```

## API Reference

### mergeGeometries(geometries)

Merges multiple geometries into a single BufferGeometry.

**Parameters:**
- `geometries: THREE.BufferGeometry[]` - Array of geometries to merge

**Returns:** `THREE.BufferGeometry | null` - Merged geometry or null if failed

### createBatchedDoorGeometry(doors, baseGeometry)

Creates a batched geometry for multiple door instances.

**Parameters:**
- `doors: DoorInstance[]` - Array of door configurations with position, rotation, scale
- `baseGeometry: THREE.BufferGeometry` - Base geometry to instance

**Returns:** `THREE.BufferGeometry | null` - Batched geometry or null if failed

### createBatchedGeometry(config)

Creates batched geometry from a configuration object.

**Parameters:**
- `config: BatchConfig` - Configuration with instances and baseGeometry

**Returns:** `THREE.BufferGeometry | null` - Batched geometry or null if failed

### createLODGeometry(baseGeometry, levels)

Creates multiple LOD levels from a base geometry.

**Parameters:**
- `baseGeometry: THREE.BufferGeometry` - High-detail base geometry
- `levels: number[]` - LOD levels as percentages (default: [1.0, 0.5, 0.25])

**Returns:** `THREE.BufferGeometry[]` - Array of geometries at different detail levels

### calculateOptimalLOD(distance, importance, config)

Calculates the optimal LOD level based on camera distance and object importance.

**Parameters:**
- `distance: number` - Distance from camera to object
- `importance: number` - Importance factor (0-1, default: 1.0)
- `config: LODConfig` - LOD configuration (default: DEFAULT_LOD_CONFIG)

**Returns:** `number` - LOD level index (0 = highest detail, higher = lower detail)

### createLODObject(geometries, material, config)

Creates a THREE.LOD object with multiple detail levels.

**Parameters:**
- `geometries: THREE.BufferGeometry[]` - Array of geometries at different detail levels
- `material: THREE.Material` - Material to apply to all LOD levels
- `config: LODConfig` - LOD configuration (default: DEFAULT_LOD_CONFIG)

**Returns:** `THREE.LOD` - LOD object with configured detail levels

### optimizeGeometry(geometry)

Optimizes a geometry for rendering performance.

**Parameters:**
- `geometry: THREE.BufferGeometry` - Geometry to optimize

**Returns:** `THREE.BufferGeometry` - Optimized geometry (same instance, modified in place)

### estimateGeometrySize(geometry)

Estimates the memory size of a geometry in bytes.

**Parameters:**
- `geometry: THREE.BufferGeometry` - Geometry to estimate

**Returns:** `number` - Estimated size in bytes

## Configuration

### LODConfig

```typescript
interface LODConfig {
  highDetail: number;    // Distance threshold for high detail (e.g., 5 meters)
  mediumDetail: number;  // Distance threshold for medium detail (e.g., 15 meters)
  lowDetail: number;     // Distance threshold for low detail (e.g., 30 meters)
}
```

### Default LOD Configuration

```typescript
const DEFAULT_LOD_CONFIG: LODConfig = {
  highDetail: 5,
  mediumDetail: 15,
  lowDetail: 30,
};
```

## Performance Benefits

### Draw Call Reduction

**Before batching:**
- 10 doors = 10 draw calls
- 20 windows = 20 draw calls
- Total: 30 draw calls

**After batching:**
- 10 doors with same material = 1 draw call
- 20 windows with same material = 1 draw call
- Total: 2 draw calls

**Result:** 93% reduction in draw calls

### Memory Optimization

**LOD System:**
- Close objects (< 5m): 100% polygon count
- Medium distance (5-15m): 50% polygon count
- Far distance (15-30m): 25% polygon count
- Very far (> 30m): Culled or minimal detail

**Result:** Significant reduction in GPU load and improved FPS

## Usage Examples

### Example 1: Batch Multiple Doors

```typescript
import { createBatchedDoorGeometry } from '@/utils/three/GeometryOptimizer';
import { DoorMaterialFactory } from '@/factories/DoorMaterialFactory';

// Create base door geometry
const doorGeometry = new THREE.BoxGeometry(0.9, 2.1, 0.05);

// Define door positions
const doorInstances = [
  { position: new THREE.Vector3(0, 1.05, 0) },
  { position: new THREE.Vector3(5, 1.05, 0) },
  { position: new THREE.Vector3(10, 1.05, 0) },
];

// Create batched geometry
const batchedGeometry = createBatchedDoorGeometry(doorInstances, doorGeometry);

// Create material (shared across all doors)
const material = DoorMaterialFactory.createPanelMaterial({ woodType: 'oak' });

// Create mesh
const batchedDoors = new THREE.Mesh(batchedGeometry, material);
scene.add(batchedDoors);

// Result: 1 draw call instead of 3
```

### Example 2: LOD for Distant Objects

```typescript
import { createLODGeometry, createLODObject } from '@/utils/three/GeometryOptimizer';

// Create base geometry
const baseGeometry = new THREE.BoxGeometry(1, 2, 0.1);

// Generate LOD levels
const lodGeometries = createLODGeometry(baseGeometry, [1.0, 0.5, 0.25]);

// Create material
const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

// Create LOD object
const lodObject = createLODObject(lodGeometries, material);
lodObject.position.set(0, 1, 0);

scene.add(lodObject);

// LOD will automatically switch detail levels based on camera distance
```

## Requirements

This utility addresses the following requirements from the website performance optimization spec:

- **Requirement 1.2**: Multiple 3D objects with similar materials create separate material instances causing excessive draw calls
- **Requirement 1.5**: 3D models use high polygon count causing unnecessary GPU load
- **Requirement 2.2**: System batches materials and merges geometries reducing draw calls significantly
- **Requirement 2.5**: System uses optimized polygon count maintaining visual quality while reducing GPU load

## Testing

The GeometryOptimizer includes comprehensive unit tests covering:
- Geometry merging with multiple geometries
- Batched geometry creation with transformations
- LOD generation and calculation
- Geometry optimization utilities
- Edge cases and error handling

Run tests:
```bash
npm test -- GeometryOptimizer.test.ts
```

## Notes

- The geometry merging implementation uses a manual approach for maximum compatibility
- LOD calculations consider object importance to maintain detail for important objects
- All functions include error handling and return null/default values on failure
- Geometries are properly disposed when evicted or no longer needed
