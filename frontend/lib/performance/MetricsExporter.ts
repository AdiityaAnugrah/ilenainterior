/**
 * MetricsExporter - Utility untuk export performance metrics ke berbagai format
 * 
 * Features:
 * - Export ke JSON format dengan complete metrics data
 * - Export ke CSV format untuk spreadsheet analysis
 * - Include device information dan session metadata
 * - Download file dengan timestamp di nama file
 * - Support browser download API dengan fallback
 * 
 * Requirements: 10.13
 */

import { PerformanceMonitor, type PerformanceMetrics } from './PerformanceMonitor';
import { deviceDetector, type DeviceInfo } from './DeviceDetector';

export interface ExportOptions {
  format: 'json' | 'csv';
  includeDeviceInfo?: boolean;
  includeHistory?: boolean;
  filename?: string;
}

export interface MetricsExportData {
  metadata: {
    exportedAt: string;
    exportTimestamp: number;
    sessionDuration: number; // milliseconds
    sessionStartTime: number;
  };
  device?: DeviceInfo;
  metrics: {
    fps: {
      current: number;
      average: number;
      min: number;
      max: number;
      history?: number[];
    };
    memory: {
      current: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
        percentage: number;
      };
      peak: {
        usedJSHeapSize: number;
        percentage: number;
      };
      formatted: {
        used: string;
        limit: string;
      };
      history?: Array<{
        timestamp: number;
        percentage: number;
        usedJSHeapSize: number;
      }>;
    };
    loadTime: {
      initial: number;
      timeToInteractive: number;
    };
    renderStats: {
      drawCalls: number;
      triangles: number;
      geometries: number;
      textures: number;
    };
    cacheStats: {
      hitRate: number;
      missRate: number;
      totalRequests: number;
      hits: number;
      misses: number;
    };
    apiLatency: Array<{
      endpoint: string;
      average: number;
      min: number;
      max: number;
      samples: number;
      history?: number[];
    }>;
  };
}

export class MetricsExporter {
  private monitor: PerformanceMonitor;
  private sessionStartTime: number;
  private fpsHistory: number[] = [];
  private memoryHistory: Array<{ timestamp: number; percentage: number; usedJSHeapSize: number }> = [];

  constructor(monitor: PerformanceMonitor) {
    this.monitor = monitor;
    this.sessionStartTime = Date.now();
  }

  /**
   * Update FPS history untuk tracking
   */
  updateFPSHistory(fps: number): void {
    this.fpsHistory.push(fps);
    // Keep last 300 samples (5 minutes at 1 sample/second)
    if (this.fpsHistory.length > 300) {
      this.fpsHistory.shift();
    }
  }

  /**
   * Update memory history untuk tracking
   */
  updateMemoryHistory(percentage: number, usedJSHeapSize: number): void {
    this.memoryHistory.push({
      timestamp: Date.now(),
      percentage,
      usedJSHeapSize,
    });
    // Keep last 300 samples (5 minutes at 1 sample/second)
    if (this.memoryHistory.length > 300) {
      this.memoryHistory.shift();
    }
  }

  /**
   * Prepare export data dengan semua metrics
   */
  prepareExportData(options: Partial<ExportOptions> = {}): MetricsExportData {
    const metrics = this.monitor.getMetrics();
    const now = Date.now();
    const sessionDuration = now - this.sessionStartTime;

    // Calculate FPS statistics
    const fpsStats = this.calculateFPSStats(metrics.fps);

    // Calculate memory statistics
    const memoryStats = this.calculateMemoryStats(metrics.memoryUsage);

    // Calculate cache statistics
    const cacheStats = this.calculateCacheStats(metrics.cacheStats);

    // Prepare API latency data
    const apiLatencyData = this.prepareAPILatencyData(metrics.apiLatency, options.includeHistory);

    const exportData: MetricsExportData = {
      metadata: {
        exportedAt: new Date(now).toISOString(),
        exportTimestamp: now,
        sessionDuration,
        sessionStartTime: this.sessionStartTime,
      },
      metrics: {
        fps: {
          current: metrics.fps,
          average: metrics.avgFps,
          min: fpsStats.min,
          max: fpsStats.max,
          ...(options.includeHistory && { history: [...this.fpsHistory] }),
        },
        memory: {
          current: metrics.memoryUsage,
          peak: memoryStats.peak,
          formatted: memoryStats.formatted,
          ...(options.includeHistory && { history: [...this.memoryHistory] }),
        },
        loadTime: metrics.loadTime,
        renderStats: metrics.renderStats,
        cacheStats,
        apiLatency: apiLatencyData,
      },
    };

    // Include device info jika diminta
    if (options.includeDeviceInfo !== false) {
      exportData.device = deviceDetector.detect();
    }

    return exportData;
  }

  /**
   * Calculate FPS statistics
   */
  private calculateFPSStats(currentFPS: number): { min: number; max: number } {
    if (this.fpsHistory.length === 0) {
      return { min: currentFPS, max: currentFPS };
    }

    return {
      min: Math.min(...this.fpsHistory),
      max: Math.max(...this.fpsHistory),
    };
  }

  /**
   * Calculate memory statistics
   */
  private calculateMemoryStats(memoryUsage: PerformanceMetrics['memoryUsage']): {
    peak: { usedJSHeapSize: number; percentage: number };
    formatted: { used: string; limit: string };
  } {
    let peakUsed = memoryUsage.usedJSHeapSize;
    let peakPercentage = memoryUsage.percentage;

    if (this.memoryHistory.length > 0) {
      const maxMemory = Math.max(...this.memoryHistory.map(m => m.usedJSHeapSize));
      const maxPercentage = Math.max(...this.memoryHistory.map(m => m.percentage));
      peakUsed = Math.max(peakUsed, maxMemory);
      peakPercentage = Math.max(peakPercentage, maxPercentage);
    }

    return {
      peak: {
        usedJSHeapSize: peakUsed,
        percentage: peakPercentage,
      },
      formatted: {
        used: this.formatBytes(memoryUsage.usedJSHeapSize),
        limit: this.formatBytes(memoryUsage.jsHeapSizeLimit),
      },
    };
  }

  /**
   * Calculate cache statistics
   */
  private calculateCacheStats(cacheStats: PerformanceMetrics['cacheStats']): {
    hitRate: number;
    missRate: number;
    totalRequests: number;
    hits: number;
    misses: number;
  } {
    const hits = Math.round((cacheStats.hitRate / 100) * cacheStats.totalRequests);
    const misses = cacheStats.totalRequests - hits;

    return {
      hitRate: cacheStats.hitRate,
      missRate: cacheStats.missRate,
      totalRequests: cacheStats.totalRequests,
      hits,
      misses,
    };
  }

  /**
   * Prepare API latency data
   */
  private prepareAPILatencyData(
    apiLatency: Map<string, number[]>,
    includeHistory?: boolean
  ): Array<{
    endpoint: string;
    average: number;
    min: number;
    max: number;
    samples: number;
    history?: number[];
  }> {
    const data: Array<{
      endpoint: string;
      average: number;
      min: number;
      max: number;
      samples: number;
      history?: number[];
    }> = [];

    apiLatency.forEach((latencies, endpoint) => {
      if (latencies.length === 0) return;

      const sum = latencies.reduce((a, b) => a + b, 0);
      const avg = Math.round(sum / latencies.length);
      const min = Math.min(...latencies);
      const max = Math.max(...latencies);

      data.push({
        endpoint,
        average: avg,
        min,
        max,
        samples: latencies.length,
        ...(includeHistory && { history: [...latencies] }),
      });
    });

    return data;
  }

  /**
   * Export metrics ke JSON format
   */
  exportToJSON(options: Partial<ExportOptions> = {}): string {
    const data = this.prepareExportData({
      includeDeviceInfo: options.includeDeviceInfo !== false,
      includeHistory: options.includeHistory !== false,
    });

    return JSON.stringify(data, null, 2);
  }

  /**
   * Export metrics ke CSV format
   */
  exportToCSV(options: Partial<ExportOptions> = {}): string {
    const data = this.prepareExportData({
      includeDeviceInfo: options.includeDeviceInfo !== false,
      includeHistory: false, // CSV tidak include history
    });

    const lines: string[] = [];

    // Header
    lines.push('Performance Metrics Export');
    lines.push(`Exported At,${data.metadata.exportedAt}`);
    lines.push(`Session Duration,${this.formatDuration(data.metadata.sessionDuration)}`);
    lines.push('');

    // Device Info
    if (data.device) {
      lines.push('Device Information');
      lines.push(`Browser,${data.device.browser.name} ${data.device.browser.version}`);
      lines.push(`OS,${data.device.os.name} ${data.device.os.version}`);
      lines.push(`Screen,${data.device.screen.width}x${data.device.screen.height} @${data.device.screen.pixelRatio}x`);
      lines.push(`GPU,${data.device.gpu.renderer}`);
      lines.push(`Device Type,${data.device.device.type}`);
      lines.push(`CPU Cores,${data.device.device.cores}`);
      if (data.device.memory.deviceMemory) {
        lines.push(`Device Memory,${data.device.memory.deviceMemory} GB`);
      }
      lines.push('');
    }

    // FPS Metrics
    lines.push('FPS Metrics');
    lines.push('Metric,Value');
    lines.push(`Current FPS,${data.metrics.fps.current}`);
    lines.push(`Average FPS,${data.metrics.fps.average}`);
    lines.push(`Min FPS,${data.metrics.fps.min}`);
    lines.push(`Max FPS,${data.metrics.fps.max}`);
    lines.push('');

    // Memory Metrics
    lines.push('Memory Metrics');
    lines.push('Metric,Value');
    lines.push(`Current Usage,${data.metrics.memory.formatted.used}`);
    lines.push(`Current Percentage,${data.metrics.memory.current.percentage}%`);
    lines.push(`Peak Usage,${this.formatBytes(data.metrics.memory.peak.usedJSHeapSize)}`);
    lines.push(`Peak Percentage,${data.metrics.memory.peak.percentage}%`);
    lines.push(`Memory Limit,${data.metrics.memory.formatted.limit}`);
    lines.push('');

    // Load Time
    lines.push('Load Time Metrics');
    lines.push('Metric,Value (ms)');
    lines.push(`Initial Load,${data.metrics.loadTime.initial}`);
    lines.push(`Time to Interactive,${data.metrics.loadTime.timeToInteractive}`);
    lines.push('');

    // Render Stats
    lines.push('Render Statistics');
    lines.push('Metric,Value');
    lines.push(`Draw Calls,${data.metrics.renderStats.drawCalls}`);
    lines.push(`Triangles,${data.metrics.renderStats.triangles}`);
    lines.push(`Geometries,${data.metrics.renderStats.geometries}`);
    lines.push(`Textures,${data.metrics.renderStats.textures}`);
    lines.push('');

    // Cache Stats
    lines.push('Cache Statistics');
    lines.push('Metric,Value');
    lines.push(`Hit Rate,${data.metrics.cacheStats.hitRate}%`);
    lines.push(`Miss Rate,${data.metrics.cacheStats.missRate}%`);
    lines.push(`Total Requests,${data.metrics.cacheStats.totalRequests}`);
    lines.push(`Cache Hits,${data.metrics.cacheStats.hits}`);
    lines.push(`Cache Misses,${data.metrics.cacheStats.misses}`);
    lines.push('');

    // API Latency
    if (data.metrics.apiLatency.length > 0) {
      lines.push('API Latency');
      lines.push('Endpoint,Average (ms),Min (ms),Max (ms),Samples');
      data.metrics.apiLatency.forEach(api => {
        lines.push(`${api.endpoint},${api.average},${api.min},${api.max},${api.samples}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Download metrics sebagai file
   */
  downloadMetrics(options: Partial<ExportOptions> = {}): void {
    const format = options.format || 'json';
    const includeDeviceInfo = options.includeDeviceInfo !== false;
    const includeHistory = options.includeHistory !== false;

    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'json') {
      content = this.exportToJSON({ includeDeviceInfo, includeHistory });
      mimeType = 'application/json';
      extension = 'json';
    } else {
      content = this.exportToCSV({ includeDeviceInfo });
      mimeType = 'text/csv';
      extension = 'csv';
    }

    // Generate filename dengan timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = options.filename || `performance-metrics-${timestamp}.${extension}`;

    // Download file
    this.downloadFile(content, filename, mimeType);
  }

  /**
   * Download file menggunakan browser download API
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    try {
      // Create blob
      const blob = new Blob([content], { type: mimeType });

      // Check if browser supports download API
      if ('download' in document.createElement('a')) {
        // Modern browsers
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Cleanup
        setTimeout(() => URL.revokeObjectURL(url), 100);
      } else {
        // Fallback untuk browser lama
        console.error('[MetricsExporter] Browser tidak support download API');
        alert('Browser Anda tidak mendukung download otomatis. Silakan copy data dari console.');
        console.log(content);
      }
    } catch (error) {
      console.error('[MetricsExporter] Error saat download file:', error);
      alert('Gagal download file. Silakan coba lagi.');
    }
  }

  /**
   * Format bytes ke human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format duration ke human-readable string
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Reset session start time (untuk testing atau new session)
   */
  resetSession(): void {
    this.sessionStartTime = Date.now();
    this.fpsHistory = [];
    this.memoryHistory = [];
  }
}
