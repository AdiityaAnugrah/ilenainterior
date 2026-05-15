/**
 * PerformanceMonitor - Real-time performance tracking and monitoring
 * 
 * Tracks FPS, memory usage, API latency, load time, and cache statistics
 * Emits warnings when thresholds are exceeded
 */

export interface PerformanceMetrics {
  fps: number;
  avgFps: number;
  memoryUsage: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    percentage: number;
  };
  loadTime: {
    initial: number;
    timeToInteractive: number;
  };
  apiLatency: Map<string, number[]>;
  cacheStats: {
    hitRate: number;
    missRate: number;
    totalRequests: number;
  };
  renderStats: {
    drawCalls: number;
    triangles: number;
    geometries: number;
    textures: number;
  };
}

export interface PerformanceMonitorConfig {
  enableFPSTracking: boolean;
  enableMemoryTracking: boolean;
  enableAPITracking: boolean;
  fpsWarningThreshold: number;
  memoryWarningThreshold: number;
  apiLatencyWarningThreshold: number;
  logInterval: number;
}

const DEFAULT_CONFIG: PerformanceMonitorConfig = {
  enableFPSTracking: true,
  enableMemoryTracking: true,
  enableAPITracking: true,
  fpsWarningThreshold: 30,
  memoryWarningThreshold: 80,
  apiLatencyWarningThreshold: 2000,
  logInterval: 10000, // 10 seconds
};

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private config: PerformanceMonitorConfig;
  private frameCount: number;
  private lastFrameTime: number;
  private fpsHistory: number[];
  private fpsAnimationId: number | null;
  private memoryIntervalId: NodeJS.Timeout | null;
  private logIntervalId: NodeJS.Timeout | null;
  private cacheHits: number;
  private cacheMisses: number;

  constructor(config?: Partial<PerformanceMonitorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.fpsHistory = [];
    this.fpsAnimationId = null;
    this.memoryIntervalId = null;
    this.logIntervalId = null;
    this.cacheHits = 0;
    this.cacheMisses = 0;

    this.metrics = {
      fps: 0,
      avgFps: 0,
      memoryUsage: {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        percentage: 0,
      },
      loadTime: {
        initial: 0,
        timeToInteractive: 0,
      },
      apiLatency: new Map(),
      cacheStats: {
        hitRate: 0,
        missRate: 0,
        totalRequests: 0,
      },
      renderStats: {
        drawCalls: 0,
        triangles: 0,
        geometries: 0,
        textures: 0,
      },
    };
  }

  // ==================== FPS Tracking ====================

  /**
   * Start tracking FPS using requestAnimationFrame
   */
  startFPSTracking(): void {
    if (!this.config.enableFPSTracking) return;

    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fpsHistory = [];

    const trackFrame = (currentTime: number) => {
      this.updateFPS(currentTime);
      this.fpsAnimationId = requestAnimationFrame(trackFrame);
    };

    this.fpsAnimationId = requestAnimationFrame(trackFrame);
  }

  /**
   * Stop tracking FPS
   */
  stopFPSTracking(): void {
    if (this.fpsAnimationId !== null) {
      cancelAnimationFrame(this.fpsAnimationId);
      this.fpsAnimationId = null;
    }
  }

  /**
   * Update FPS calculation
   */
  updateFPS(currentTime?: number): void {
    if (currentTime === undefined) {
      currentTime = performance.now();
    }

    const deltaTime = currentTime - this.lastFrameTime;

    if (deltaTime >= 1000) {
      // Calculate FPS
      const fps = Math.round((this.frameCount * 1000) / deltaTime);
      this.metrics.fps = fps;

      // Update FPS history (keep last 60 samples)
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }

      // Calculate average FPS
      const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
      this.metrics.avgFps = Math.round(sum / this.fpsHistory.length);

      // Keep FPS metrics internal; do not spam customer/browser console.

      // Reset for next measurement
      this.frameCount = 0;
      this.lastFrameTime = currentTime;
    }

    this.frameCount++;
  }

  /**
   * Get current FPS
   */
  getFPS(): number {
    return this.metrics.fps;
  }

  /**
   * Get average FPS from history
   */
  getAverageFPS(): number {
    return this.metrics.avgFps;
  }

  // ==================== Memory Tracking ====================

  /**
   * Start tracking memory usage
   */
  startMemoryTracking(): void {
    if (!this.config.enableMemoryTracking) return;

    // Check if performance.memory is available (Chrome only)
    if (!('memory' in performance)) {
      console.warn('[PerformanceMonitor] performance.memory API not available');
      return;
    }

    // Update memory usage every 5 seconds
    this.memoryIntervalId = setInterval(() => {
      this.updateMemoryUsage();
    }, 5000);

    // Initial update
    this.updateMemoryUsage();
  }

  /**
   * Stop tracking memory usage
   */
  stopMemoryTracking(): void {
    if (this.memoryIntervalId !== null) {
      clearInterval(this.memoryIntervalId);
      this.memoryIntervalId = null;
    }
  }

  /**
   * Update memory usage metrics
   */
  private updateMemoryUsage(): void {
    if (!('memory' in performance)) return;

    const memory = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    const usedJSHeapSize = memory.usedJSHeapSize;
    const totalJSHeapSize = memory.totalJSHeapSize;
    const jsHeapSizeLimit = memory.jsHeapSizeLimit;
    const percentage = Math.round((usedJSHeapSize / jsHeapSizeLimit) * 100);

    this.metrics.memoryUsage = {
      usedJSHeapSize,
      totalJSHeapSize,
      jsHeapSizeLimit,
      percentage,
    };

    // Check for memory warning
    if (this.checkMemoryWarning()) {
      console.warn(
        `[PerformanceMonitor] High memory usage: ${percentage}% (threshold: ${this.config.memoryWarningThreshold}%)`
      );
    }
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): PerformanceMetrics['memoryUsage'] {
    return this.metrics.memoryUsage;
  }

  /**
   * Check if memory usage exceeds warning threshold
   */
  checkMemoryWarning(): boolean {
    return this.metrics.memoryUsage.percentage >= this.config.memoryWarningThreshold;
  }

  // ==================== API Tracking ====================

  /**
   * Track API call latency
   */
  trackAPICall(endpoint: string, duration: number): void {
    if (!this.config.enableAPITracking) return;

    // Get or create latency array for this endpoint
    let latencies = this.metrics.apiLatency.get(endpoint);
    if (!latencies) {
      latencies = [];
      this.metrics.apiLatency.set(endpoint, latencies);
    }

    // Add duration to history (keep last 100 samples)
    latencies.push(duration);
    if (latencies.length > 100) {
      latencies.shift();
    }

    // Check for API latency warning
    if (duration > this.config.apiLatencyWarningThreshold) {
      console.warn(
        `[PerformanceMonitor] Slow API call: ${endpoint} took ${duration}ms (threshold: ${this.config.apiLatencyWarningThreshold}ms)`
      );
    }
  }

  /**
   * Get latency history for an endpoint
   */
  getAPILatency(endpoint: string): number[] {
    return this.metrics.apiLatency.get(endpoint) || [];
  }

  /**
   * Get average latency for an endpoint
   */
  getAverageAPILatency(endpoint: string): number {
    const latencies = this.getAPILatency(endpoint);
    if (latencies.length === 0) return 0;

    const sum = latencies.reduce((a, b) => a + b, 0);
    return Math.round(sum / latencies.length);
  }

  // ==================== Load Time Tracking ====================

  /**
   * Track load time (initial or time-to-interactive)
   */
  trackLoadTime(phase: 'initial' | 'interactive', time: number): void {
    if (phase === 'initial') {
      this.metrics.loadTime.initial = time;
    } else {
      this.metrics.loadTime.timeToInteractive = time;
    }
  }

  /**
   * Get load time metrics
   */
  getLoadTime(): PerformanceMetrics['loadTime'] {
    return this.metrics.loadTime;
  }

  // ==================== Cache Stats ====================

  /**
   * Update cache statistics
   */
  updateCacheStats(hit: boolean): void {
    if (hit) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }

    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;
    const missRate = totalRequests > 0 ? (this.cacheMisses / totalRequests) * 100 : 0;

    this.metrics.cacheStats = {
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round(missRate * 100) / 100,
      totalRequests,
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): PerformanceMetrics['cacheStats'] {
    return this.metrics.cacheStats;
  }

  // ==================== Render Stats Tracking ====================

  /**
   * Update render statistics from Three.js renderer
   * 
   * @param renderer - Three.js WebGLRenderer instance
   */
  updateRenderStats(renderer: { info?: { render?: { calls?: number; triangles?: number }; memory?: { geometries?: number; textures?: number } } }): void {
    if (!renderer || !renderer.info) {
      return;
    }

    const info = renderer.info;
    
    this.metrics.renderStats = {
      drawCalls: info.render?.calls || 0,
      triangles: info.render?.triangles || 0,
      geometries: info.memory?.geometries || 0,
      textures: info.memory?.textures || 0,
    };
  }

  /**
   * Get render statistics
   */
  getRenderStats(): PerformanceMetrics['renderStats'] {
    return this.metrics.renderStats;
  }

  // ==================== General Methods ====================

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetrics {
    return this.metrics;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.fpsHistory = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;

    this.metrics = {
      fps: 0,
      avgFps: 0,
      memoryUsage: {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        percentage: 0,
      },
      loadTime: {
        initial: 0,
        timeToInteractive: 0,
      },
      apiLatency: new Map(),
      cacheStats: {
        hitRate: 0,
        missRate: 0,
        totalRequests: 0,
      },
      renderStats: {
        drawCalls: 0,
        triangles: 0,
        geometries: 0,
        textures: 0,
      },
    };
  }

  /**
   * Log metrics to console
   */
  logMetrics(): void {
    console.group('[PerformanceMonitor] Metrics');
    console.log('FPS:', this.metrics.fps, '| Avg:', this.metrics.avgFps);
    console.log(
      'Memory:',
      this.formatBytes(this.metrics.memoryUsage.usedJSHeapSize),
      '/',
      this.formatBytes(this.metrics.memoryUsage.jsHeapSizeLimit),
      `(${this.metrics.memoryUsage.percentage}%)`
    );
    console.log('Load Time:', {
      initial: `${this.metrics.loadTime.initial}ms`,
      interactive: `${this.metrics.loadTime.timeToInteractive}ms`,
    });
    console.log('Cache Stats:', {
      hitRate: `${this.metrics.cacheStats.hitRate}%`,
      missRate: `${this.metrics.cacheStats.missRate}%`,
      totalRequests: this.metrics.cacheStats.totalRequests,
    });
    console.log('Render Stats:', {
      drawCalls: this.metrics.renderStats.drawCalls,
      triangles: this.metrics.renderStats.triangles,
      geometries: this.metrics.renderStats.geometries,
      textures: this.metrics.renderStats.textures,
    });

    if (this.metrics.apiLatency.size > 0) {
      console.log('API Latency:');
      this.metrics.apiLatency.forEach((latencies, endpoint) => {
        const avg = this.getAverageAPILatency(endpoint);
        console.log(`  ${endpoint}: ${avg}ms (${latencies.length} samples)`);
      });
    }

    console.groupEnd();
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(): string {
    const exportData = {
      timestamp: Date.now(),
      fps: this.metrics.fps,
      avgFps: this.metrics.avgFps,
      memoryUsage: this.metrics.memoryUsage,
      loadTime: this.metrics.loadTime,
      cacheStats: this.metrics.cacheStats,
      renderStats: this.metrics.renderStats,
      apiLatency: Array.from(this.metrics.apiLatency.entries()).map(([endpoint, latencies]) => ({
        endpoint,
        average: this.getAverageAPILatency(endpoint),
        samples: latencies.length,
        min: Math.min(...latencies),
        max: Math.max(...latencies),
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Start automatic logging at configured interval
   */
  startAutoLogging(): void {
    if (this.logIntervalId !== null) return;

    this.logIntervalId = setInterval(() => {
      this.logMetrics();
    }, this.config.logInterval);
  }

  /**
   * Stop automatic logging
   */
  stopAutoLogging(): void {
    if (this.logIntervalId !== null) {
      clearInterval(this.logIntervalId);
      this.logIntervalId = null;
    }
  }

  /**
   * Cleanup and stop all tracking
   */
  destroy(): void {
    this.stopFPSTracking();
    this.stopMemoryTracking();
    this.stopAutoLogging();
  }

  // ==================== Utility Methods ====================

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

// Export singleton instance for convenience
let globalMonitor: PerformanceMonitor | null = null;

export function getGlobalPerformanceMonitor(
  config?: Partial<PerformanceMonitorConfig>
): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor(config);
  }
  return globalMonitor;
}

export function resetGlobalPerformanceMonitor(): void {
  if (globalMonitor) {
    globalMonitor.destroy();
    globalMonitor = null;
  }
}
