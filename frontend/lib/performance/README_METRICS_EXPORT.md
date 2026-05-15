# Performance Metrics Export Utility

## Overview

Utility untuk export performance metrics ke JSON dan CSV format untuk analytics dan historical performance analysis.

**Requirement:** 10.13

## Files Created

### 1. DeviceDetector.ts
Utility untuk mendeteksi informasi device dan browser.

**Features:**
- Deteksi browser name dan version (Chrome, Firefox, Safari, Edge, Opera)
- Deteksi operating system (Windows, macOS, Linux, Android, iOS)
- Deteksi screen resolution dan pixel ratio
- Deteksi GPU renderer info dari WebGL context
- Deteksi available memory (deviceMemory, jsHeapSizeLimit)
- Deteksi device type (mobile, tablet, desktop)
- Deteksi CPU cores
- Deteksi network connection info (effectiveType, downlink, rtt)
- Helper method untuk check low-end device

**Usage:**
```typescript
import { deviceDetector } from '@/lib/performance/DeviceDetector';

// Get device info
const deviceInfo = deviceDetector.detect();
console.log(deviceInfo.browser.name); // "Chrome"
console.log(deviceInfo.os.name); // "Windows"
console.log(deviceInfo.gpu.renderer); // "ANGLE (NVIDIA GeForce GTX 1060)"

// Get summary
console.log(deviceDetector.getSummary());

// Check if low-end device
if (deviceDetector.isLowEndDevice()) {
  console.log('Low-end device detected');
}
```

### 2. MetricsExporter.ts
Utility untuk export performance metrics ke berbagai format.

**Features:**
- Export ke JSON format dengan complete metrics data
- Export ke CSV format untuk spreadsheet analysis (Excel/Google Sheets compatible)
- Include device information dan session metadata
- Track FPS history dan memory history
- Calculate statistics (min, max, average, peak)
- Download file dengan timestamp di nama file
- Support browser download API dengan error handling

**Export Data Structure:**
```typescript
{
  metadata: {
    exportedAt: "2026-05-11T06:50:00.000Z",
    exportTimestamp: 1715412600000,
    sessionDuration: 300000, // 5 minutes
    sessionStartTime: 1715412300000
  },
  device: {
    browser: { name, version, userAgent },
    os: { name, version },
    screen: { width, height, pixelRatio, colorDepth },
    gpu: { vendor, renderer },
    memory: { deviceMemory, jsHeapSizeLimit },
    device: { type, touchSupport, cores },
    connection: { effectiveType, downlink, rtt }
  },
  metrics: {
    fps: { current, average, min, max, history },
    memory: { current, peak, formatted, history },
    loadTime: { initial, timeToInteractive },
    renderStats: { drawCalls, triangles, geometries, textures },
    cacheStats: { hitRate, missRate, totalRequests, hits, misses },
    apiLatency: [{ endpoint, average, min, max, samples, history }]
  }
}
```

**Usage:**
```typescript
import { MetricsExporter } from '@/lib/performance/MetricsExporter';
import { PerformanceMonitor } from '@/lib/performance/PerformanceMonitor';

const monitor = new PerformanceMonitor();
const exporter = new MetricsExporter(monitor);

// Update history (call periodically)
exporter.updateFPSHistory(60);
exporter.updateMemoryHistory(45, 150000000);

// Export to JSON
const jsonData = exporter.exportToJSON({
  includeDeviceInfo: true,
  includeHistory: true
});

// Export to CSV
const csvData = exporter.exportToCSV({
  includeDeviceInfo: true
});

// Download as file
exporter.downloadMetrics({
  format: 'json', // or 'csv'
  includeDeviceInfo: true,
  includeHistory: true,
  filename: 'custom-metrics.json' // optional
});
```

### 3. PerformanceDashboard.tsx (Modified)
Integrated export functionality ke dashboard UI.

**New Features:**
- Export button dengan dropdown menu (JSON/CSV)
- Automatic history tracking untuk FPS dan memory
- Update exporter history setiap metrics update
- Success notification setelah download
- Error handling untuk failed exports

**UI Changes:**
- Added Download icon button di header (hanya visible saat expanded)
- Dropdown menu dengan 2 options: "Export JSON" dan "Export CSV"
- Menu auto-close setelah export

## How to Use

### From PerformanceDashboard UI

1. Open PerformanceDashboard (biasanya di bottom-right corner)
2. Click tombol Download icon di header
3. Pilih format: "Export JSON" atau "Export CSV"
4. File akan otomatis download dengan nama `performance-metrics-YYYY-MM-DD-HH-MM-SS.json` atau `.csv`

### Programmatically

```typescript
import { PerformanceMonitor } from '@/lib/performance/PerformanceMonitor';
import { MetricsExporter } from '@/lib/performance/MetricsExporter';

// Setup monitor
const monitor = new PerformanceMonitor();
monitor.startFPSTracking();
monitor.startMemoryTracking();

// Setup exporter
const exporter = new MetricsExporter(monitor);

// Update history periodically (e.g., every second)
setInterval(() => {
  const metrics = monitor.getMetrics();
  exporter.updateFPSHistory(metrics.fps);
  exporter.updateMemoryHistory(
    metrics.memoryUsage.percentage,
    metrics.memoryUsage.usedJSHeapSize
  );
}, 1000);

// Export when needed
exporter.downloadMetrics({
  format: 'json',
  includeDeviceInfo: true,
  includeHistory: true
});
```

## Export Format Examples

### JSON Format
```json
{
  "metadata": {
    "exportedAt": "2026-05-11T06:50:00.000Z",
    "exportTimestamp": 1715412600000,
    "sessionDuration": 300000,
    "sessionStartTime": 1715412300000
  },
  "device": {
    "browser": {
      "name": "Chrome",
      "version": "124.0"
    },
    "os": {
      "name": "Windows",
      "version": "10/11"
    },
    "screen": {
      "width": 1920,
      "height": 1080,
      "pixelRatio": 1,
      "colorDepth": 24
    },
    "gpu": {
      "vendor": "Google Inc. (NVIDIA)",
      "renderer": "ANGLE (NVIDIA GeForce GTX 1060)"
    }
  },
  "metrics": {
    "fps": {
      "current": 60,
      "average": 58,
      "min": 45,
      "max": 60,
      "history": [60, 59, 58, ...]
    },
    "memory": {
      "current": {
        "usedJSHeapSize": 150000000,
        "percentage": 45
      },
      "peak": {
        "usedJSHeapSize": 180000000,
        "percentage": 54
      }
    }
  }
}
```

### CSV Format
```csv
Performance Metrics Export
Exported At,2026-05-11T06:50:00.000Z
Session Duration,5m 0s

Device Information
Browser,Chrome 124.0
OS,Windows 10/11
Screen,1920x1080 @1x
GPU,ANGLE (NVIDIA GeForce GTX 1060)
Device Type,desktop
CPU Cores,8

FPS Metrics
Metric,Value
Current FPS,60
Average FPS,58
Min FPS,45
Max FPS,60

Memory Metrics
Metric,Value
Current Usage,143.05 MB
Current Percentage,45%
Peak Usage,171.66 MB
Peak Percentage,54%

...
```

## Browser Compatibility

### DeviceDetector
- ✅ Browser detection: All browsers
- ✅ OS detection: All browsers
- ✅ Screen info: All browsers
- ✅ GPU info: All browsers with WebGL support
- ⚠️ Device memory: Chrome only
- ⚠️ JS heap size: Chrome only
- ⚠️ Network info: Chrome only

### MetricsExporter
- ✅ JSON export: All modern browsers
- ✅ CSV export: All modern browsers
- ✅ File download: All modern browsers with download API
- ⚠️ Fallback: Console log untuk browser lama

## Error Handling

1. **WebGL not supported**: GPU info akan return "WebGL not supported"
2. **Memory API not available**: Memory fields akan undefined
3. **Download API not supported**: Alert user dan log ke console
4. **Export error**: Alert user dengan error message

## Performance Impact

- **DeviceDetector**: Minimal impact, hanya run once saat detect()
- **MetricsExporter**: Minimal impact, hanya store history arrays (max 300 samples)
- **History tracking**: ~1KB memory per 300 samples
- **Export operation**: Synchronous, tapi fast (<100ms untuk typical data)

## Future Enhancements

1. Auto-export setiap X menit untuk long-running sessions
2. Export ke cloud storage (S3, Firebase)
3. Real-time streaming ke analytics service
4. Comparison tool untuk compare multiple exports
5. Visualization tool untuk analyze exported data
6. Custom export templates
7. Compression untuk large exports

## Testing

Manual testing required:
1. Open PerformanceDashboard
2. Let it run for a few minutes untuk collect history
3. Click Download button
4. Test both JSON dan CSV exports
5. Verify file downloads dengan correct filename
6. Open exported files dan verify data completeness
7. Test CSV di Excel/Google Sheets untuk verify compatibility
8. Test di different browsers (Chrome, Firefox, Safari, Edge)
9. Test di mobile devices
10. Test error scenarios (disable download API, etc.)
