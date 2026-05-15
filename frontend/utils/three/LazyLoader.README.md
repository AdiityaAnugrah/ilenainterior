# LazyLoader Utilities

## Overview

The LazyLoader utilities provide a comprehensive system for lazy loading heavy 3D components in React applications. This system helps optimize initial page load time and reduce memory usage by deferring the loading of non-critical components until they are needed or visible.

## Features

- **Priority-based Loading**: Control loading order with priority levels (CRITICAL, HIGH, MEDIUM, LOW)
- **React Hooks**: Easy-to-use hooks for component lazy loading
- **Intersection Observer**: Automatically load components when they become visible
- **Background Preloading**: Preload components in the background for better UX
- **Loading Queue**: Manages loading order and prevents blocking

## Requirements

This implementation addresses the following requirements from the website performance optimization spec:

- **Requirement 1.3**: Synchronous loading of all 3D components causing long initial load time
- **Requirement 2.3**: Implement lazy loading for heavy 3D components
- **Requirement 3.3**: Critical components must still load immediately (preservation)

## Bug Condition

The lazy loading system fixes the performance bug where:
```
input.loadingStrategy == 'synchronous' AND input.componentCount > 5
```

When more than 5 components are loaded synchronously, the page experiences:
- Long initial load time (3-5 seconds)
- High memory spike
- Poor user experience

## Expected Behavior

With lazy loading enabled:
- Heavy components load only when needed or visible
- Initial load time reduced by 30-40%
- Critical components still load immediately (preserved behavior)
- Memory usage spread over time instead of all at once

## API Reference

### Load Priority Levels

```typescript
enum LoadPriority {
  CRITICAL = 0,   // Load immediately (main room, visible elements)
  HIGH = 1,       // Load soon (nearby components)
  MEDIUM = 2,     // Load when idle (off-screen components)
  LOW = 3,        // Load last (distant components)
}
```

### Load States

```typescript
enum LoadState {
  IDLE = 'idle',           // Not started loading
  LOADING = 'loading',     // Currently loading
  LOADED = 'loaded',       // Successfully loaded
  ERROR = 'error',         // Failed to load
}
```

### useLazyComponent Hook

Loads a component with priority-based queuing and state management.

```typescript
function useLazyComponent<T>(
  loader: ComponentLoader<T>,
  config?: LazyLoadConfig
): {
  data: T | null;
  state: LoadState;
  error: Error | null;
  load: () => void;
}
```

**Parameters:**
- `loader`: Function that returns a promise resolving to the component
- `config`: Optional configuration object
  - `priority`: Loading priority (default: MEDIUM)
  - `preload`: Whether to preload in background (default: false)
  - `enabled`: Whether lazy loading is enabled (default: true)

**Example:**

```tsx
import { useLazyComponent, LoadPriority, LoadState } from '@/utils/three/LazyLoader';

function MyScene() {
  const { data: OutdoorEnv, state, error } = useLazyComponent(
    () => import('./OutdoorEnvironment'),
    { priority: LoadPriority.MEDIUM }
  );

  if (state === LoadState.LOADED && OutdoorEnv) {
    const Component = OutdoorEnv.default || OutdoorEnv;
    return <Component />;
  }

  if (state === LoadState.ERROR) {
    console.error('Failed to load outdoor environment', error);
    return null;
  }

  // Show loading state or placeholder
  return <LoadingPlaceholder />;
}
```

### useIntersectionLoader Hook

Loads components when they become visible in the viewport using Intersection Observer API.

```typescript
function useIntersectionLoader<T>(
  loader: ComponentLoader<T>,
  config?: LazyLoadConfig
): {
  data: T | null;
  state: LoadState;
  error: Error | null;
  ref: React.RefObject<any>;
}
```

**Parameters:**
- `loader`: Function that returns a promise resolving to the component
- `config`: Optional configuration object
  - `priority`: Loading priority (default: MEDIUM)
  - `threshold`: Intersection observer threshold 0-1 (default: 0.1)
  - `rootMargin`: Intersection observer root margin (default: '50px')
  - `enabled`: Whether lazy loading is enabled (default: true)

**Example:**

```tsx
import { useIntersectionLoader, LoadPriority, LoadState } from '@/utils/three/LazyLoader';

function DistantDoor({ position }) {
  const { data: Door, state, ref } = useIntersectionLoader(
    () => import('./DoorComponent'),
    { priority: LoadPriority.HIGH, threshold: 0.1 }
  );

  return (
    <group ref={ref} position={position}>
      {state === LoadState.LOADED && Door && <Door.default />}
      {state === LoadState.LOADING && <SimpleDoorPlaceholder />}
    </group>
  );
}
```

### preloadComponent Function

Preloads a component in the background without rendering it.

```typescript
function preloadComponent<T>(
  loader: ComponentLoader<T>,
  priority?: LoadPriority
): Promise<T>
```

**Parameters:**
- `loader`: Function that returns a promise resolving to the component
- `priority`: Loading priority (default: LOW)

**Example:**

```tsx
import { preloadComponent, LoadPriority } from '@/utils/three/LazyLoader';

function MyScene() {
  useEffect(() => {
    // Preload outdoor environment in background
    preloadComponent(
      () => import('./OutdoorEnvironment'),
      LoadPriority.LOW
    );
  }, []);

  return <MainRoom />;
}
```

### batchPreload Function

Preloads multiple components with specified priorities.

```typescript
function batchPreload(
  loaders: Array<{ loader: ComponentLoader; priority?: LoadPriority }>
): Promise<any[]>
```

**Example:**

```tsx
import { batchPreload, LoadPriority } from '@/utils/three/LazyLoader';

useEffect(() => {
  batchPreload([
    { loader: () => import('./Door'), priority: LoadPriority.HIGH },
    { loader: () => import('./Window'), priority: LoadPriority.MEDIUM },
    { loader: () => import('./Furniture'), priority: LoadPriority.LOW },
  ]);
}, []);
```

### useShouldLazyLoad Hook

Determines if a component should be lazy loaded based on conditions.

```typescript
function useShouldLazyLoad(
  componentCount: number,
  loadingStrategy: 'synchronous' | 'lazy',
  isCritical: boolean
): boolean
```

**Example:**

```tsx
import { useShouldLazyLoad } from '@/utils/three/LazyLoader';

function RoomMesh({ doors, windows }) {
  const componentCount = doors.length + windows.length;
  const shouldLazyLoad = useShouldLazyLoad(componentCount, 'synchronous', false);

  if (shouldLazyLoad) {
    return <LazyLoadedComponents doors={doors} windows={windows} />;
  }

  return <SynchronousComponents doors={doors} windows={windows} />;
}
```

### getLoadingStats Function

Returns statistics about the loading queue.

```typescript
function getLoadingStats(): {
  queueSize: number;
  isLoading: boolean;
}
```

**Example:**

```tsx
import { getLoadingStats } from '@/utils/three/LazyLoader';

function DebugPanel() {
  const [stats, setStats] = useState(getLoadingStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getLoadingStats());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <p>Queue Size: {stats.queueSize}</p>
      <p>Loading: {stats.isLoading ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

## Usage Patterns

### Pattern 1: Critical Component (Immediate Loading)

```tsx
// Main room should load immediately
const { data: MainRoom, state } = useLazyComponent(
  () => import('./MainRoom'),
  { priority: LoadPriority.CRITICAL }
);
```

### Pattern 2: Visible Component (High Priority)

```tsx
// Visible doors/windows should load soon
const { data: Door, state } = useLazyComponent(
  () => import('./Door'),
  { priority: LoadPriority.HIGH, preload: true }
);
```

### Pattern 3: Off-Screen Component (Intersection Observer)

```tsx
// Off-screen components load when visible
const { data: Furniture, state, ref } = useIntersectionLoader(
  () => import('./Furniture'),
  { priority: LoadPriority.MEDIUM, threshold: 0.1 }
);
```

### Pattern 4: Background Preloading

```tsx
// Preload components that will be needed soon
useEffect(() => {
  preloadComponent(
    () => import('./OutdoorEnvironment'),
    LoadPriority.LOW
  );
}, []);
```

## Performance Impact

Based on the design document, lazy loading provides:

- **30-40% reduction in initial load time** (from 3-5s to 1.8-2.5s)
- **Reduced memory spike** by spreading component loading over time
- **Better user experience** with faster time to interactive
- **Preserved functionality** for critical components

## Bug Condition vs Expected Behavior

### Bug Condition (Before Fix)

```typescript
// All components load synchronously
<RoomMesh>
  <MainRoom />
  <OutdoorEnvironment />
  <Door />
  <Door />
  <Door />
  <Window />
  <Window />
  {/* All load at once = 3-5 second load time */}
</RoomMesh>
```

### Expected Behavior (After Fix)

```typescript
// Critical components load immediately, others lazy load
<RoomMesh>
  <MainRoom priority={LoadPriority.CRITICAL} />
  <LazyOutdoorEnvironment priority={LoadPriority.MEDIUM} />
  <LazyDoor priority={LoadPriority.HIGH} />
  <LazyDoor priority={LoadPriority.HIGH} />
  <LazyDoor priority={LoadPriority.HIGH} />
  <LazyWindow priority={LoadPriority.MEDIUM} />
  <LazyWindow priority={LoadPriority.MEDIUM} />
  {/* Staggered loading = 1.8-2.5 second initial load */}
</RoomMesh>
```

## Preservation Requirements

The lazy loading system preserves the following behaviors:

1. **Critical components load immediately** - No delay for main room or visible elements
2. **Lazy loading can be disabled** - Set `enabled: false` to use synchronous loading
3. **All components eventually load** - Lazy loading defers, not prevents, loading
4. **No visual degradation** - Users see loading states or placeholders, not broken UI

## Testing

The LazyLoader utilities include comprehensive unit tests covering:

- Component loading with different priorities
- Error handling
- Intersection observer integration
- Preloading functionality
- Bug condition validation
- Preservation requirements

Run tests with:

```bash
npm test -- LazyLoader.test.ts --run
```

## Integration with Other Systems

The LazyLoader works alongside other performance optimizations:

- **Texture Cache**: Lazy-loaded components use cached textures
- **Material Batching**: Lazy-loaded components share batched materials
- **LOD System**: Lazy-loaded components use appropriate detail levels

## Best Practices

1. **Use CRITICAL priority sparingly** - Only for components that must render immediately
2. **Prefer intersection observer** - For off-screen components
3. **Preload predictively** - Preload components the user will likely need soon
4. **Provide loading states** - Show placeholders or loading indicators
5. **Handle errors gracefully** - Always check for ERROR state and provide fallbacks
6. **Monitor queue stats** - Use `getLoadingStats()` to debug loading issues

## Troubleshooting

### Components not loading

- Check that `enabled` is not set to `false`
- Verify the loader function returns a valid promise
- Check for errors in the console
- Use `getLoadingStats()` to see queue status

### Components loading in wrong order

- Verify priority levels are set correctly
- Remember: Lower priority number = higher priority (CRITICAL=0, LOW=3)
- Check that critical components use `LoadPriority.CRITICAL`

### Intersection observer not triggering

- Ensure the ref is attached to a DOM element
- Check threshold and rootMargin settings
- Verify the element actually enters the viewport
- Test with `enabled: true` explicitly set

## Future Enhancements

Potential improvements for future versions:

- Adaptive priority based on network speed
- Predictive preloading based on user behavior
- Integration with React Suspense
- Bandwidth-aware loading strategies
- Progressive loading for large components

## Related Files

- `LazyLoader.ts` - Main implementation
- `LazyLoader.test.ts` - Unit tests
- `TextureCache.ts` - Texture caching system
- `GeometryOptimizer.ts` - Geometry optimization utilities
