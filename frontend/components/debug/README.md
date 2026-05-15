# Performance Dashboard

Real-time performance monitoring dashboard for the ILENA INTERIOR 3D room planner application.

## Overview

The Performance Dashboard provides comprehensive real-time monitoring of application performance metrics including FPS, memory usage, API latency, cache statistics, and render stats.

## Features

- **FPS Monitoring**: Real-time FPS graph with 60-sample history
- **Memory Tracking**: Memory usage graph with percentage and formatted byte display
- **API Latency**: Average latency statistics for API endpoints
- **Cache Statistics**: Hit rate and miss rate visualization
- **Render Stats**: Draw calls, triangles, geometries, and textures count
- **Collapsible UI**: Minimize to save screen space
- **Draggable**: Position anywhere on screen
- **Auto-update**: Configurable update interval (default: 1.5 seconds)
- **Development Mode**: Only visible in development by default

## Usage

### Basic Usage

```tsx
import PerformanceDashboard from '@/components/debug/PerformanceDashboard';
import { PerformanceMonitor } from '@/lib/performance/PerformanceMonitor';

function MyComponent() {
  const monitor = new PerformanceMonitor();
  const [showDashboard, setShowDashboard] = useState(true);

  return (
    <>
      <PerformanceDashboard
        monitor={monitor}
        visible={showDashboard}
        onClose={() => setShowDashboard(false)}
        updateInterval={1500}
      />
    </>
  );
}
```

### Integration with Canvas3D

The Performance Dashboard is integrated into the Canvas3D component:

```tsx
// Canvas3D.tsx
const [showDashboard, setShowDashboard] = useState(process.env.NODE_ENV === 'development');

// Toggle button
<button onClick={() => setShowDashboard(!showDashboard)}>
  📊 {showDashboard ? 'Hide' : 'Show'} Stats
</button>

// Dashboard component
{performanceMonitorRef.current && (
  <PerformanceDashboard
    monitor={performanceMonitorRef.current}
    visible={showDashboard}
    onClose={() => setShowDashboard(false)}
    updateInterval={1500}
  />
)}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `monitor` | `PerformanceMonitor` | required | PerformanceMonitor instance to track metrics |
| `visible` | `boolean` | `true` | Whether the dashboard is visible |
| `onClose` | `() => void` | `undefined` | Callback when close button is clicked |
| `updateInterval` | `number` | `1000` | Update interval in milliseconds |

## Metrics Displayed

### FPS (Frames Per Second)
- Current FPS
- Average FPS
- Line chart with 60-sample history
- Color-coded: Green (≥55), Yellow (30-54), Red (<30)

### Memory Usage
- Current percentage
- Used heap size / Total heap size
- Line chart with 60-sample history
- Color-coded: Green (<60%), Yellow (60-79%), Red (≥80%)

### Render Stats
- Draw Calls: Number of draw calls per frame
- Triangles: Total triangles rendered (in thousands)
- Geometries: Number of geometries in scene
- Textures: Number of textures loaded

### API Latency
- Average latency per endpoint
- Shows top 5 most recent endpoints
- Color-coded: Green (<500ms), Yellow (500-999ms), Red (≥1000ms)

### Cache Statistics
- Hit Rate: Percentage of cache hits
- Miss Rate: Percentage of cache misses
- Total Requests: Total number of cache requests
- Visual progress bars for hit/miss rates

## UI Features

### Collapsible View
Click the minimize button to collapse the dashboard to a compact view showing only:
- Current FPS
- Memory percentage
- Draw calls

### Draggable
Click and drag the header to reposition the dashboard anywhere on screen.

### Close Button
Click the X button to hide the dashboard (if `onClose` prop is provided).

## Performance Impact

The Performance Dashboard is designed to have minimal performance impact:

- **When Hidden**: No rendering or updates occur (zero impact)
- **When Visible**: Updates only at specified interval (default 1.5s)
- **Lightweight Charts**: Uses SVG for charts (no external charting library)
- **Efficient Updates**: Only updates changed metrics

## Requirements Satisfied

This component satisfies the following requirements from the performance optimization spec:

- **Requirement 10.11**: Performance dashboard to visualize metrics (FPS graph, memory graph, API latency)
- **Requirement 10.12**: Track cache hit rate and cache miss rate to evaluate caching effectiveness

## Testing

The component includes comprehensive unit tests covering:

- Rendering when visible/hidden
- Displaying all metric types
- Collapse/expand functionality
- Close button callback
- Periodic metric updates
- Chart rendering
- Color coding based on thresholds

Run tests:
```bash
npm test -- components/debug/PerformanceDashboard.test.tsx
```

## Browser Compatibility

- **Chrome/Edge**: Full support including memory tracking
- **Firefox/Safari**: FPS and render stats only (no `performance.memory` API)

## Development Tips

### Accessing Metrics Programmatically

The Canvas3D component exposes performance metrics via `window.__performanceMetrics`:

```javascript
// In browser console
window.__performanceMetrics.getMetrics()
window.__performanceMetrics.getFPS()
window.__performanceMetrics.getMemoryUsage()
window.__performanceMetrics.getRenderStats()
window.__performanceMetrics.logMetrics()
window.__performanceMetrics.exportMetrics()
```

### Customizing Update Interval

Adjust the `updateInterval` prop to balance between real-time updates and performance:

- **Fast (500ms)**: More responsive, higher overhead
- **Normal (1000-1500ms)**: Good balance (recommended)
- **Slow (3000ms+)**: Lower overhead, less responsive

### Production Usage

By default, the dashboard is only visible in development mode. To enable in production:

```tsx
const [showDashboard, setShowDashboard] = useState(true); // Always visible
```

Or add a feature flag:

```tsx
const [showDashboard, setShowDashboard] = useState(
  process.env.NODE_ENV === 'development' || 
  localStorage.getItem('enablePerformanceDashboard') === 'true'
);
```

## Future Enhancements

Potential improvements for future versions:

- Export metrics to CSV/JSON
- Historical data persistence
- Performance alerts/notifications
- Network request waterfall
- Frame time histogram
- GPU memory tracking
- Custom metric plugins
