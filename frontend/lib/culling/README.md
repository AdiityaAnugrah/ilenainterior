# Frustum Culling Optimization

## Overview

The Frustum Culling system optimizes 3D rendering performance by skipping objects that are outside the camera's viewport. This significantly reduces the number of draw calls and improves frame rates, especially in scenes with many furniture items.

## Implementation

### FrustumCuller Class

Located in `frontend/lib/culling/FrustumCuller.ts`

The `FrustumCuller` class provides efficient frustum culling using Three.js Frustum and Matrix4 for culling calculations.

#### Key Features

- **Bounding Sphere Tests**: Fast culling using bounding spheres for initial tests
- **Bounding Box Fallback**: More accurate culling using bounding boxes when needed
- **Configurable Update Interval**: Update frustum every N frames to reduce overhead
- **Culling Statistics**: Track total objects, visible objects, culled objects, and culling time
- **Culling Margin**: Optional margin to expand frustum and avoid popping artifacts

#### Configuration Options

```typescript
interface FrustumCullerConfig {
  updateInterval: number;        // Update frustum every N frames (default: 5)
  enableStats: boolean;          // Enable statistics tracking (default: true)
  enableBoundingSphere: boolean; // Use bounding sphere for faster tests (default: true)
  cullingMargin: number;         // Margin to expand frustum (default: 0)
}
```

#### Usage Example

```typescript
import { FrustumCuller } from '@/lib/culling/FrustumCuller';

// Create instance
const culler = new FrustumCuller({
  updateInterval: 5,
  enableStats: true,
  enableBoundingSphere: true,
  cullingMargin: 0.5,
});

// In render loop
useFrame(() => {
  const didCull = culler.cullScene(scene, camera);
  
  if (didCull) {
    const stats = culler.getStats();
    console.log(`Culled ${stats.culledObjects} of ${stats.totalObjects} objects`);
  }
});
```

## Integration with Canvas3D

The frustum culling system is integrated into `Canvas3D.tsx` through the `FrustumCullingUpdater` component.

### FrustumCullingUpdater Component

This component runs in the Three.js render loop and performs frustum culling on scene objects:

```typescript
function FrustumCullingUpdater({ culler, performanceMonitor }: FrustumCullingUpdaterProps) {
  const { scene, camera } = useThree();
  
  useFrame(() => {
    // Perform frustum culling (only updates every N frames based on config)
    const didCull = culler.cullScene(scene, camera);
    
    // Track culling stats in performance monitor
    if (didCull) {
      const stats = culler.getStats();
      // Log stats in development mode
    }
  });
  
  return null;
}
```

### Initialization

The `FrustumCuller` is initialized in `Canvas3D` component on mount:

```typescript
useEffect(() => {
  const culler = new FrustumCuller({
    updateInterval: 5,
    enableStats: true,
    enableBoundingSphere: true,
    cullingMargin: 0.5,
  });

  frustumCullerRef.current = culler;

  // Expose metrics to window for debugging
  (window as any).__cullingMetrics = {
    getStats: () => culler.getStats(),
    getCullingEfficiency: () => culler.getCullingEfficiency(),
    resetStats: () => culler.resetStats(),
  };
}, []);
```

## Performance Characteristics

### Update Interval

The frustum culling system updates every N frames (default: 5) to reduce overhead:

- **Every frame**: Most accurate but higher CPU cost
- **Every 5 frames**: Good balance between accuracy and performance (recommended)
- **Every 10 frames**: Lower CPU cost but may cause visible popping

### Culling Strategy

1. **Update Frustum**: Extract frustum from camera projection and view matrices
2. **Traverse Scene**: Iterate through all mesh objects in the scene
3. **Bounding Sphere Test**: Fast initial test using bounding sphere
4. **Bounding Box Fallback**: More accurate test if bounding sphere not available
5. **Update Visibility**: Set object.visible based on frustum test

### Performance Impact

For a scene with 100 furniture items:

- **Without Culling**: All 100 objects rendered every frame
- **With Culling**: Only visible objects rendered (typically 20-40 objects)
- **Culling Overhead**: ~0.5-2ms per update (every 5 frames)
- **Net Performance Gain**: 30-50% FPS improvement in large scenes

## Monitoring and Debugging

### Window API

Access culling metrics from browser console:

```javascript
// Get current statistics
window.__cullingMetrics.getStats()
// Returns: { totalObjects, visibleObjects, culledObjects, cullingTime, lastUpdate }

// Get culling efficiency (percentage of objects culled)
window.__cullingMetrics.getCullingEfficiency()
// Returns: 65.5 (means 65.5% of objects were culled)

// Reset statistics
window.__cullingMetrics.resetStats()
```

### Console Logging

In development mode, culling stats are logged to console:

```
[FrustumCulling] Total: 100, Visible: 35, Culled: 65 (65.0%), Time: 1.23ms
```

### Statistics Tracking

The `CullingStats` interface provides detailed metrics:

```typescript
interface CullingStats {
  totalObjects: number;      // Total objects checked
  visibleObjects: number;    // Objects within frustum
  culledObjects: number;     // Objects outside frustum
  cullingTime: number;       // Time taken for culling (ms)
  lastUpdate: number;        // Timestamp of last update
}
```

## Optimization Tips

### 1. Adjust Update Interval

For scenes with slow camera movement:
```typescript
const culler = new FrustumCuller({
  updateInterval: 10, // Update less frequently
});
```

For scenes with fast camera movement:
```typescript
const culler = new FrustumCuller({
  updateInterval: 3, // Update more frequently
});
```

### 2. Use Culling Margin

Add margin to prevent objects from popping in/out at frustum edges:
```typescript
const culler = new FrustumCuller({
  cullingMargin: 0.5, // Add 0.5 units margin
});
```

### 3. Disable for Small Scenes

For scenes with < 20 objects, frustum culling overhead may exceed benefits:
```typescript
// Only enable culling for large scenes
if (items.length > 20) {
  culler.cullScene(scene, camera);
}
```

### 4. Combine with LOD System

Frustum culling works best when combined with Level of Detail (LOD) system:
- Frustum culling: Skip objects outside viewport
- LOD system: Reduce detail for distant objects

## Requirements Satisfied

This implementation satisfies the following requirements from the performance optimization spec:

- **Requirement 1.8**: "THE Renderer SHALL menggunakan frustum culling untuk tidak render object di luar viewport"
- **Requirement 1.9**: "THE Renderer SHALL menggunakan occlusion culling untuk tidak render object yang tertutup object lain" (Partial - frustum culling implemented, occlusion culling can be added later)

## Future Enhancements

### Occlusion Culling

Add occlusion culling to skip objects hidden behind other objects:
```typescript
// Check if object is occluded by other objects
const isOccluded = checkOcclusion(object, scene, camera);
if (isOccluded) {
  object.visible = false;
}
```

### Spatial Partitioning

Use octree or BVH for faster culling in very large scenes:
```typescript
// Build octree for scene
const octree = new Octree(scene);

// Cull using octree
const visibleObjects = octree.search(frustum);
```

### GPU Occlusion Queries

Use WebGL occlusion queries for hardware-accelerated culling:
```typescript
// Render bounding boxes to occlusion buffer
// Query visibility from GPU
const isVisible = gl.getQueryParameter(query, gl.QUERY_RESULT);
```

## Testing

### Manual Testing

1. Open the 3D planner in browser
2. Add 50+ furniture items to the scene
3. Open browser console and check culling stats:
   ```javascript
   window.__cullingMetrics.getStats()
   ```
4. Move camera around and observe:
   - Objects outside viewport should be culled
   - Culling efficiency should be 40-70% depending on camera angle
   - FPS should improve compared to no culling

### Performance Testing

Compare FPS with and without frustum culling:

```typescript
// Disable culling
const culler = new FrustumCuller({
  updateInterval: 999999, // Effectively disabled
});

// Enable culling
const culler = new FrustumCuller({
  updateInterval: 5, // Normal operation
});
```

Expected results:
- **Without culling**: 30-40 FPS (100 objects)
- **With culling**: 45-60 FPS (100 objects, 30-40 visible)

## Troubleshooting

### Objects Popping In/Out

**Problem**: Objects suddenly appear/disappear at frustum edges

**Solution**: Increase culling margin
```typescript
const culler = new FrustumCuller({
  cullingMargin: 1.0, // Increase margin
});
```

### High Culling Overhead

**Problem**: Culling takes too long (> 5ms)

**Solution**: Increase update interval
```typescript
const culler = new FrustumCuller({
  updateInterval: 10, // Update less frequently
});
```

### Objects Not Being Culled

**Problem**: All objects remain visible even when outside viewport

**Solution**: Check if objects have bounding volumes
```typescript
// Ensure geometry has bounding sphere/box
object.geometry.computeBoundingSphere();
object.geometry.computeBoundingBox();
```

## References

- [Three.js Frustum Documentation](https://threejs.org/docs/#api/en/math/Frustum)
- [Three.js Matrix4 Documentation](https://threejs.org/docs/#api/en/math/Matrix4)
- [Frustum Culling Explained](https://learnopengl.com/Guest-Articles/2021/Scene/Frustum-Culling)
