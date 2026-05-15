/**
 * QualityManager - Device capability detection and automatic quality adjustment
 * 
 * Detects device capabilities (GPU, memory, CPU cores, screen resolution)
 * and automatically adjusts quality settings for optimal performance on low-end devices.
 * Integrates with PerformanceMonitor for dynamic quality adjustment based on FPS.
 */

import { PerformanceMonitor } from '../performance/PerformanceMonitor';

const DEBUG_QUALITY_MANAGER = false;
const debugLog = (...args: unknown[]) => {
  if (DEBUG_QUALITY_MANAGER) debugLog(...args);
};
const debugWarn = (...args: unknown[]) => {
  if (DEBUG_QUALITY_MANAGER) debugWarn(...args);
};
const debugGroup = (...args: unknown[]) => {
  if (DEBUG_QUALITY_MANAGER) debugGroup(...args);
};
const debugGroupEnd = () => {
  if (DEBUG_QUALITY_MANAGER) debugGroupEnd();
};

export type QualityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

export interface QualitySettings {
  // Shadow settings
  shadows: {
    enabled: boolean;
    resolution: 256 | 512 | 1024 | 2048;
  };
  
  // Texture settings
  textures: {
    resolutionMultiplier: number; // 0.25, 0.5, 0.75, 1.0
  };
  
  // Antialiasing settings
  antialiasing: {
    enabled: boolean;
    samples: 0 | 2 | 4 | 8;
  };
  
  // Post-processing effects
  postProcessing: {
    enabled: boolean;
  };
  
  // LOD (Level of Detail) settings
  lod: {
    nearThreshold: number; // meters
    farThreshold: number; // meters
  };
  
  // Performance settings
  performance: {
    maxConcurrentModels: number;
  };
}

export interface DeviceCapabilities {
  gpu: {
    renderer: string;
    vendor: string;
    maxTextureSize: number;
    tier: 'low' | 'medium' | 'high'; // GPU performance tier
  };
  memory: {
    deviceMemory: number; // GB (if available)
    estimated: boolean;
  };
  cpu: {
    cores: number;
  };
  screen: {
    width: number;
    height: number;
    pixelRatio: number;
    totalPixels: number;
  };
  webgl: {
    version: 1 | 2;
    extensions: string[];
  };
}

export interface QualityManagerConfig {
  performanceMonitor?: PerformanceMonitor;
  enableAutoAdjust: boolean;
  fpsThresholdLow: number; // FPS below this triggers quality reduction
  fpsThresholdHigh: number; // FPS above this allows quality increase
  adjustmentInterval: number; // ms between quality adjustments
  manualOverride?: QualityLevel;
}

const DEFAULT_CONFIG: QualityManagerConfig = {
  enableAutoAdjust: true,
  fpsThresholdLow: 30,
  fpsThresholdHigh: 55,
  adjustmentInterval: 5000, // 5 seconds
};

// Quality presets
const QUALITY_PRESETS: Record<QualityLevel, QualitySettings> = {
  LOW: {
    shadows: {
      enabled: false,
      resolution: 256,
    },
    textures: {
      resolutionMultiplier: 0.25,
    },
    antialiasing: {
      enabled: false,
      samples: 0,
    },
    postProcessing: {
      enabled: false,
    },
    lod: {
      nearThreshold: 3,
      farThreshold: 8,
    },
    performance: {
      maxConcurrentModels: 20,
    },
  },
  MEDIUM: {
    shadows: {
      enabled: true,
      resolution: 512,
    },
    textures: {
      resolutionMultiplier: 0.5,
    },
    antialiasing: {
      enabled: true,
      samples: 2,
    },
    postProcessing: {
      enabled: false,
    },
    lod: {
      nearThreshold: 5,
      farThreshold: 15,
    },
    performance: {
      maxConcurrentModels: 40,
    },
  },
  HIGH: {
    shadows: {
      enabled: true,
      resolution: 1024,
    },
    textures: {
      resolutionMultiplier: 0.75,
    },
    antialiasing: {
      enabled: true,
      samples: 2,
    },
    postProcessing: {
      enabled: true,
    },
    lod: {
      nearThreshold: 10,
      farThreshold: 25,
    },
    performance: {
      maxConcurrentModels: 60,
    },
  },
  ULTRA: {
    shadows: {
      enabled: true,
      resolution: 2048,
    },
    textures: {
      resolutionMultiplier: 1.0,
    },
    antialiasing: {
      enabled: true,
      samples: 4,
    },
    postProcessing: {
      enabled: true,
    },
    lod: {
      nearThreshold: 15,
      farThreshold: 40,
    },
    performance: {
      maxConcurrentModels: 100,
    },
  },
};

export class QualityManager {
  private config: QualityManagerConfig;
  private deviceCapabilities: DeviceCapabilities | null;
  private currentQuality: QualityLevel;
  private currentSettings: QualitySettings;
  private adjustmentTimer: NodeJS.Timeout | null;
  private lowFPSCount: number;
  private highFPSCount: number;
  private degradationMode: boolean;
  private disabledFeatures: string[];

  constructor(config?: Partial<QualityManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.deviceCapabilities = null;
    this.currentQuality = 'MEDIUM';
    this.currentSettings = QUALITY_PRESETS.MEDIUM;
    this.adjustmentTimer = null;
    this.lowFPSCount = 0;
    this.highFPSCount = 0;
    this.degradationMode = false;
    this.disabledFeatures = [];
  }

  // ==================== Device Detection ====================

  /**
   * Detect device capabilities
   */
  detectDeviceCapabilities(): DeviceCapabilities {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

    if (!gl) {
      throw new Error('WebGL not supported');
    }

    // GPU detection
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : 'Unknown';
    const vendor = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
      : 'Unknown';
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    // Determine GPU tier based on renderer string
    const gpuTier = this.determineGPUTier(renderer);

    // Memory detection
    const deviceMemory = (navigator as any).deviceMemory || 0;
    const estimatedMemory = deviceMemory === 0 ? this.estimateMemory() : deviceMemory;

    // CPU detection
    const cores = navigator.hardwareConcurrency || 4;

    // Screen detection
    const width = window.screen.width;
    const height = window.screen.height;
    const pixelRatio = window.devicePixelRatio || 1;
    const totalPixels = width * height * pixelRatio * pixelRatio;

    // WebGL version
    const webglVersion = gl instanceof WebGL2RenderingContext ? 2 : 1;

    // WebGL extensions
    const extensions = gl.getSupportedExtensions() || [];

    this.deviceCapabilities = {
      gpu: {
        renderer,
        vendor,
        maxTextureSize,
        tier: gpuTier,
      },
      memory: {
        deviceMemory: estimatedMemory,
        estimated: deviceMemory === 0,
      },
      cpu: {
        cores,
      },
      screen: {
        width,
        height,
        pixelRatio,
        totalPixels,
      },
      webgl: {
        version: webglVersion,
        extensions,
      },
    };

    return this.deviceCapabilities;
  }

  /**
   * Determine GPU performance tier based on renderer string
   */
  private determineGPUTier(renderer: string): 'low' | 'medium' | 'high' {
    const rendererLower = renderer.toLowerCase();

    // High-end GPUs
    const highEndPatterns = [
      'nvidia geforce rtx',
      'nvidia geforce gtx 16',
      'nvidia geforce gtx 20',
      'nvidia geforce gtx 30',
      'nvidia geforce gtx 40',
      'amd radeon rx 6',
      'amd radeon rx 7',
      'apple m1',
      'apple m2',
      'apple m3',
    ];

    // Low-end GPUs
    const lowEndPatterns = [
      'intel hd graphics',
      'intel uhd graphics 6',
      'intel iris',
      'mali',
      'adreno 5',
      'adreno 6',
      'powervr',
      'swiftshader',
    ];

    // Check high-end
    for (const pattern of highEndPatterns) {
      if (rendererLower.includes(pattern)) {
        return 'high';
      }
    }

    // Check low-end
    for (const pattern of lowEndPatterns) {
      if (rendererLower.includes(pattern)) {
        return 'low';
      }
    }

    // Default to medium
    return 'medium';
  }

  /**
   * Estimate device memory based on other factors
   */
  private estimateMemory(): number {
    // Rough estimation based on screen resolution and pixel ratio
    const totalPixels = window.screen.width * window.screen.height * (window.devicePixelRatio || 1);

    if (totalPixels < 1000000) {
      return 2; // Low-end device
    } else if (totalPixels < 2000000) {
      return 4; // Mid-range device
    } else if (totalPixels < 4000000) {
      return 8; // High-end device
    } else {
      return 16; // Very high-end device
    }
  }

  /**
   * Get device capabilities
   */
  getDeviceCapabilities(): DeviceCapabilities {
    if (!this.deviceCapabilities) {
      this.detectDeviceCapabilities();
    }
    return this.deviceCapabilities!;
  }

  // ==================== Quality Detection ====================

  /**
   * Auto-detect appropriate quality level based on device capabilities
   */
  autoDetectQuality(): QualityLevel {
    const capabilities = this.getDeviceCapabilities();

    // Calculate device score (0-100)
    let score = 0;

    // GPU tier (0-40 points)
    if (capabilities.gpu.tier === 'high') {
      score += 40;
    } else if (capabilities.gpu.tier === 'medium') {
      score += 25;
    } else {
      score += 10;
    }

    // Memory (0-25 points)
    if (capabilities.memory.deviceMemory >= 8) {
      score += 25;
    } else if (capabilities.memory.deviceMemory >= 4) {
      score += 15;
    } else {
      score += 5;
    }

    // CPU cores (0-15 points)
    if (capabilities.cpu.cores >= 8) {
      score += 15;
    } else if (capabilities.cpu.cores >= 4) {
      score += 10;
    } else {
      score += 5;
    }

    // Screen resolution (0-20 points)
    if (capabilities.screen.totalPixels >= 8000000) {
      // 4K+
      score += 20;
    } else if (capabilities.screen.totalPixels >= 4000000) {
      // 1440p+
      score += 15;
    } else if (capabilities.screen.totalPixels >= 2000000) {
      // 1080p+
      score += 10;
    } else {
      score += 5;
    }

    // Determine quality level based on score
    if (score >= 80) {
      return 'ULTRA';
    } else if (score >= 60) {
      return 'HIGH';
    } else if (score >= 40) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  // ==================== Quality Management ====================

  /**
   * Set quality level
   */
  setQuality(level: QualityLevel): void {
    this.currentQuality = level;
    this.currentSettings = { ...QUALITY_PRESETS[level] };

    debugLog(`[QualityManager] Quality set to ${level}`);
    this.logQualitySettings();
  }

  /**
   * Get current quality level
   */
  getQuality(): QualityLevel {
    return this.currentQuality;
  }

  /**
   * Get current quality settings
   */
  getSettings(): QualitySettings {
    return this.currentSettings;
  }

  /**
   * Get quality preset
   */
  getPreset(level: QualityLevel): QualitySettings {
    return { ...QUALITY_PRESETS[level] };
  }

  /**
   * Set manual quality override
   */
  setManualOverride(level: QualityLevel | null): void {
    if (level === null) {
      this.config.manualOverride = undefined;
      debugLog('[QualityManager] Manual override removed');
    } else {
      this.config.manualOverride = level;
      this.setQuality(level);
      debugLog(`[QualityManager] Manual override set to ${level}`);
    }
  }

  /**
   * Check if manual override is active
   */
  hasManualOverride(): boolean {
    return this.config.manualOverride !== undefined;
  }

  // ==================== Dynamic Quality Adjustment ====================

  /**
   * Start automatic quality adjustment based on FPS
   */
  startAutoAdjust(): void {
    if (!this.config.enableAutoAdjust || this.config.manualOverride) {
      debugLog('[QualityManager] Auto-adjust disabled or manual override active');
      return;
    }

    if (!this.config.performanceMonitor) {
      debugWarn('[QualityManager] PerformanceMonitor not provided, auto-adjust disabled');
      return;
    }

    if (this.adjustmentTimer !== null) {
      return; // Already running
    }

    debugLog('[QualityManager] Starting auto-adjust');

    this.adjustmentTimer = setInterval(() => {
      this.checkAndAdjustQuality();
    }, this.config.adjustmentInterval);
  }

  /**
   * Stop automatic quality adjustment
   */
  stopAutoAdjust(): void {
    if (this.adjustmentTimer !== null) {
      clearInterval(this.adjustmentTimer);
      this.adjustmentTimer = null;
      debugLog('[QualityManager] Auto-adjust stopped');
    }
  }

  /**
   * Check FPS and adjust quality if needed
   */
  private checkAndAdjustQuality(): void {
    if (!this.config.performanceMonitor || this.config.manualOverride) {
      return;
    }

    const fps = this.config.performanceMonitor.getFPS();
    const avgFps = this.config.performanceMonitor.getAverageFPS();

    // Use average FPS for more stable decisions
    const targetFps = avgFps > 0 ? avgFps : fps;

    if (targetFps < this.config.fpsThresholdLow) {
      this.lowFPSCount++;
      this.highFPSCount = 0;

      // Reduce quality after 2 consecutive low FPS readings
      if (this.lowFPSCount >= 2) {
        this.reduceQuality();
        this.lowFPSCount = 0;
      }
    } else if (targetFps > this.config.fpsThresholdHigh) {
      this.highFPSCount++;
      this.lowFPSCount = 0;

      // Increase quality after 3 consecutive high FPS readings
      if (this.highFPSCount >= 3) {
        this.increaseQuality();
        this.highFPSCount = 0;
      }
    } else {
      // FPS in acceptable range, reset counters
      this.lowFPSCount = 0;
      this.highFPSCount = 0;
    }
  }

  /**
   * Reduce quality level
   */
  private reduceQuality(): void {
    const levels: QualityLevel[] = ['ULTRA', 'HIGH', 'MEDIUM', 'LOW'];
    const currentIndex = levels.indexOf(this.currentQuality);

    if (currentIndex < levels.length - 1) {
      const newQuality = levels[currentIndex + 1];
      this.setQuality(newQuality);
    }
  }

  /**
   * Increase quality level
   */
  private increaseQuality(): void {
    const levels: QualityLevel[] = ['ULTRA', 'HIGH', 'MEDIUM', 'LOW'];
    const currentIndex = levels.indexOf(this.currentQuality);

    if (currentIndex > 0) {
      const newQuality = levels[currentIndex - 1];
      debugLog(
        `[QualityManager] Increasing quality from ${this.currentQuality} to ${newQuality} due to high FPS`
      );
      this.setQuality(newQuality);
    } else {
      debugLog('[QualityManager] Already at highest quality level');
    }
  }

  // ==================== Initialization ====================

  /**
   * Initialize quality manager with auto-detection
   */
  initialize(): void {
    debugLog('[QualityManager] Initializing...');

    // Detect device capabilities
    const capabilities = this.detectDeviceCapabilities();
    debugLog('[QualityManager] Device capabilities:', capabilities);

    // Auto-detect quality level if no manual override
    if (!this.config.manualOverride) {
      const detectedQuality = this.autoDetectQuality();
      debugLog(`[QualityManager] Auto-detected quality: ${detectedQuality}`);
      this.setQuality(detectedQuality);
    } else {
      debugLog(`[QualityManager] Using manual override: ${this.config.manualOverride}`);
      this.setQuality(this.config.manualOverride);
    }

    // Start auto-adjust if enabled
    if (this.config.enableAutoAdjust && !this.config.manualOverride) {
      this.startAutoAdjust();
    }
  }

  // ==================== Graceful Degradation ====================

  /**
   * Enable graceful degradation mode for low-end devices
   */
  enableGracefulDegradation(): void {
    this.degradationMode = true;
    this.disabledFeatures = [];

    // Force LOW quality
    this.setQuality('LOW');

    // Disable auto-adjust to keep at LOW
    this.config.enableAutoAdjust = false;
    this.stopAutoAdjust();

    // Build list of disabled features
    if (!this.currentSettings.shadows.enabled) {
      this.disabledFeatures.push('Shadows');
    }
    if (!this.currentSettings.postProcessing.enabled) {
      this.disabledFeatures.push('Post-processing');
    }
    if (!this.currentSettings.antialiasing.enabled) {
      this.disabledFeatures.push('Antialiasing');
    }
    if (this.currentSettings.textures.resolutionMultiplier < 0.5) {
      this.disabledFeatures.push('High-resolution textures');
    }
    if (this.currentSettings.performance.maxConcurrentModels < 30) {
      this.disabledFeatures.push('High model count');
    }

    debugWarn('[QualityManager] Graceful degradation mode enabled');
    debugWarn('[QualityManager] Disabled features:', this.disabledFeatures);
  }

  /**
   * Disable graceful degradation mode
   */
  disableGracefulDegradation(): void {
    this.degradationMode = false;
    this.disabledFeatures = [];

    // Re-enable auto-adjust if no manual override
    if (!this.config.manualOverride) {
      this.config.enableAutoAdjust = true;
      this.startAutoAdjust();
    }

    debugLog('[QualityManager] Graceful degradation mode disabled');
  }

  /**
   * Check if in degradation mode
   */
  isInDegradationMode(): boolean {
    return this.degradationMode;
  }

  /**
   * Get list of disabled features
   */
  getDisabledFeatures(): string[] {
    return [...this.disabledFeatures];
  }

  /**
   * Get recommendations for user
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.degradationMode) {
      recommendations.push('Tutup aplikasi lain untuk membebaskan memory');
      recommendations.push('Kurangi jumlah furniture di scene');
      recommendations.push('Gunakan browser terbaru untuk performa optimal');
      
      const capabilities = this.getDeviceCapabilities();
      if (capabilities.memory.deviceMemory && capabilities.memory.deviceMemory < 4) {
        recommendations.push('Pertimbangkan upgrade RAM untuk pengalaman lebih baik');
      }
      if (capabilities.cpu.cores < 4) {
        recommendations.push('Device dengan CPU multi-core akan memberikan performa lebih baik');
      }
    }

    return recommendations;
  }

  // ==================== Utility Methods ====================

  /**
   * Log current quality settings
   */
  private logQualitySettings(): void {
    debugGroup(`[QualityManager] Quality Settings (${this.currentQuality})`);
    debugLog('Shadows:', this.currentSettings.shadows);
    debugLog('Textures:', this.currentSettings.textures);
    debugLog('Antialiasing:', this.currentSettings.antialiasing);
    debugLog('Post-processing:', this.currentSettings.postProcessing);
    debugLog('LOD:', this.currentSettings.lod);
    debugLog('Performance:', this.currentSettings.performance);
    debugLog('Degradation mode:', this.degradationMode);
    if (this.degradationMode) {
      debugLog('Disabled features:', this.disabledFeatures);
    }
    debugGroupEnd();
  }

  /**
   * Export device and quality info
   */
  exportInfo(): string {
    const info = {
      deviceCapabilities: this.deviceCapabilities,
      currentQuality: this.currentQuality,
      currentSettings: this.currentSettings,
      manualOverride: this.config.manualOverride,
      autoAdjustEnabled: this.config.enableAutoAdjust,
      degradationMode: this.degradationMode,
      disabledFeatures: this.disabledFeatures,
    };

    return JSON.stringify(info, null, 2);
  }

  /**
   * Cleanup and stop all tracking
   */
  destroy(): void {
    this.stopAutoAdjust();
  }
}

// ==================== Singleton Instance ====================

let globalQualityManager: QualityManager | null = null;

/**
 * Get global QualityManager instance
 */
export function getGlobalQualityManager(
  config?: Partial<QualityManagerConfig>
): QualityManager {
  if (!globalQualityManager) {
    globalQualityManager = new QualityManager(config);
  }
  return globalQualityManager;
}

/**
 * Reset global QualityManager instance
 */
export function resetGlobalQualityManager(): void {
  if (globalQualityManager) {
    globalQualityManager.destroy();
    globalQualityManager = null;
  }
}
