/**
 * DeviceDetector - Utility untuk mendeteksi informasi device dan browser
 * 
 * Mendeteksi:
 * - Browser name dan version
 * - Operating system
 * - Screen resolution
 * - GPU renderer info (dari WebGL context)
 * - Available memory (jika tersedia)
 * - Device type (mobile, tablet, desktop)
 */

export interface DeviceInfo {
  browser: {
    name: string;
    version: string;
    userAgent: string;
  };
  os: {
    name: string;
    version: string;
  };
  screen: {
    width: number;
    height: number;
    pixelRatio: number;
    colorDepth: number;
  };
  gpu: {
    vendor: string;
    renderer: string;
  };
  memory: {
    deviceMemory?: number; // GB
    jsHeapSizeLimit?: number; // bytes
  };
  device: {
    type: 'mobile' | 'tablet' | 'desktop';
    touchSupport: boolean;
    cores: number;
  };
  connection?: {
    effectiveType?: string; // '4g', '3g', '2g', 'slow-2g'
    downlink?: number; // Mbps
    rtt?: number; // ms
    saveData?: boolean;
  };
}

export class DeviceDetector {
  private static instance: DeviceDetector | null = null;
  private deviceInfo: DeviceInfo | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): DeviceDetector {
    if (!DeviceDetector.instance) {
      DeviceDetector.instance = new DeviceDetector();
    }
    return DeviceDetector.instance;
  }

  /**
   * Detect semua informasi device
   */
  detect(): DeviceInfo {
    if (this.deviceInfo) {
      return this.deviceInfo;
    }

    this.deviceInfo = {
      browser: this.detectBrowser(),
      os: this.detectOS(),
      screen: this.detectScreen(),
      gpu: this.detectGPU(),
      memory: this.detectMemory(),
      device: this.detectDevice(),
      connection: this.detectConnection(),
    };

    return this.deviceInfo;
  }

  /**
   * Detect browser name dan version
   */
  private detectBrowser(): DeviceInfo['browser'] {
    const ua = navigator.userAgent;
    let name = 'Unknown';
    let version = 'Unknown';

    // Chrome
    if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) {
      name = 'Chrome';
      const match = ua.match(/Chrome\/(\d+\.\d+)/);
      if (match) version = match[1];
    }
    // Edge (Chromium)
    else if (ua.indexOf('Edg') > -1) {
      name = 'Edge';
      const match = ua.match(/Edg\/(\d+\.\d+)/);
      if (match) version = match[1];
    }
    // Firefox
    else if (ua.indexOf('Firefox') > -1) {
      name = 'Firefox';
      const match = ua.match(/Firefox\/(\d+\.\d+)/);
      if (match) version = match[1];
    }
    // Safari
    else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
      name = 'Safari';
      const match = ua.match(/Version\/(\d+\.\d+)/);
      if (match) version = match[1];
    }
    // Opera
    else if (ua.indexOf('OPR') > -1 || ua.indexOf('Opera') > -1) {
      name = 'Opera';
      const match = ua.match(/(?:OPR|Opera)\/(\d+\.\d+)/);
      if (match) version = match[1];
    }

    return {
      name,
      version,
      userAgent: ua,
    };
  }

  /**
   * Detect operating system
   */
  private detectOS(): DeviceInfo['os'] {
    const ua = navigator.userAgent;
    let name = 'Unknown';
    let version = 'Unknown';

    // Windows
    if (ua.indexOf('Windows NT') > -1) {
      name = 'Windows';
      const match = ua.match(/Windows NT (\d+\.\d+)/);
      if (match) {
        const ntVersion = match[1];
        // Map NT version ke Windows version
        const versionMap: Record<string, string> = {
          '10.0': '10/11',
          '6.3': '8.1',
          '6.2': '8',
          '6.1': '7',
        };
        version = versionMap[ntVersion] || ntVersion;
      }
    }
    // macOS
    else if (ua.indexOf('Mac OS X') > -1) {
      name = 'macOS';
      const match = ua.match(/Mac OS X (\d+[._]\d+)/);
      if (match) version = match[1].replace('_', '.');
    }
    // Linux
    else if (ua.indexOf('Linux') > -1) {
      name = 'Linux';
      if (ua.indexOf('Android') > -1) {
        name = 'Android';
        const match = ua.match(/Android (\d+\.\d+)/);
        if (match) version = match[1];
      }
    }
    // iOS
    else if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) {
      name = 'iOS';
      const match = ua.match(/OS (\d+[._]\d+)/);
      if (match) version = match[1].replace('_', '.');
    }

    return { name, version };
  }

  /**
   * Detect screen information
   */
  private detectScreen(): DeviceInfo['screen'] {
    return {
      width: window.screen.width,
      height: window.screen.height,
      pixelRatio: window.devicePixelRatio || 1,
      colorDepth: window.screen.colorDepth,
    };
  }

  /**
   * Detect GPU information dari WebGL context
   */
  private detectGPU(): DeviceInfo['gpu'] {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
      return {
        vendor: 'Unknown',
        renderer: 'WebGL not supported',
      };
    }

    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    
    if (debugInfo) {
      const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown';
      const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown';
      
      return {
        vendor: String(vendor),
        renderer: String(renderer),
      };
    }

    return {
      vendor: String((gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).VENDOR) || 'Unknown'),
      renderer: String((gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).RENDERER) || 'Unknown'),
    };
  }

  /**
   * Detect memory information
   */
  private detectMemory(): DeviceInfo['memory'] {
    const memory: DeviceInfo['memory'] = {};

    // Device memory (Chrome only)
    if ('deviceMemory' in navigator) {
      memory.deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    }

    // JS heap size limit (Chrome only)
    if ('memory' in performance) {
      const perfMemory = (performance as Performance & { memory?: { jsHeapSizeLimit: number } }).memory;
      if (perfMemory) {
        memory.jsHeapSizeLimit = perfMemory.jsHeapSizeLimit;
      }
    }

    return memory;
  }

  /**
   * Detect device type dan capabilities
   */
  private detectDevice(): DeviceInfo['device'] {
    const ua = navigator.userAgent;
    let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';

    // Check for mobile
    if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      type = 'mobile';
    }
    // Check for tablet
    else if (/iPad|Android(?!.*Mobile)/i.test(ua)) {
      type = 'tablet';
    }

    // Touch support
    const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // CPU cores
    const cores = navigator.hardwareConcurrency || 1;

    return {
      type,
      touchSupport,
      cores,
    };
  }

  /**
   * Detect network connection information
   */
  private detectConnection(): DeviceInfo['connection'] | undefined {
    // Network Information API (Chrome only)
    const nav = navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
      };
    };

    if ('connection' in nav && nav.connection) {
      return {
        effectiveType: nav.connection.effectiveType,
        downlink: nav.connection.downlink,
        rtt: nav.connection.rtt,
        saveData: nav.connection.saveData,
      };
    }

    return undefined;
  }

  /**
   * Get device info summary sebagai string
   */
  getSummary(): string {
    const info = this.detect();
    
    const lines = [
      `Browser: ${info.browser.name} ${info.browser.version}`,
      `OS: ${info.os.name} ${info.os.version}`,
      `Screen: ${info.screen.width}x${info.screen.height} @${info.screen.pixelRatio}x`,
      `GPU: ${info.gpu.renderer}`,
      `Device: ${info.device.type} (${info.device.cores} cores)`,
    ];

    if (info.memory.deviceMemory) {
      lines.push(`Memory: ${info.memory.deviceMemory} GB`);
    }

    if (info.connection) {
      lines.push(`Connection: ${info.connection.effectiveType || 'Unknown'}`);
    }

    return lines.join('\n');
  }

  /**
   * Get device performance score (0-100)
   * Higher score = better performance
   */
  getDeviceScore(): number {
    const info = this.detect();
    let score = 0;

    // GPU tier (0-35 points)
    const gpuRenderer = info.gpu.renderer.toLowerCase();
    if (
      gpuRenderer.includes('nvidia geforce rtx') ||
      gpuRenderer.includes('amd radeon rx 6') ||
      gpuRenderer.includes('amd radeon rx 7') ||
      gpuRenderer.includes('apple m1') ||
      gpuRenderer.includes('apple m2') ||
      gpuRenderer.includes('apple m3')
    ) {
      score += 35; // High-end GPU
    } else if (
      gpuRenderer.includes('nvidia geforce gtx') ||
      gpuRenderer.includes('amd radeon rx 5') ||
      gpuRenderer.includes('intel iris')
    ) {
      score += 20; // Mid-range GPU
    } else if (
      gpuRenderer.includes('intel hd') ||
      gpuRenderer.includes('intel uhd') ||
      gpuRenderer.includes('mali') ||
      gpuRenderer.includes('adreno') ||
      gpuRenderer.includes('swiftshader')
    ) {
      score += 5; // Low-end GPU
    } else {
      score += 15; // Unknown GPU (assume mid-range)
    }

    // Memory (0-25 points)
    if (info.memory.deviceMemory) {
      if (info.memory.deviceMemory >= 8) {
        score += 25;
      } else if (info.memory.deviceMemory >= 4) {
        score += 15;
      } else if (info.memory.deviceMemory >= 2) {
        score += 8;
      } else {
        score += 3;
      }
    } else {
      // Estimate based on device type
      if (info.device.type === 'desktop') {
        score += 15;
      } else if (info.device.type === 'tablet') {
        score += 10;
      } else {
        score += 5;
      }
    }

    // CPU cores (0-20 points)
    if (info.device.cores >= 8) {
      score += 20;
    } else if (info.device.cores >= 4) {
      score += 12;
    } else if (info.device.cores >= 2) {
      score += 6;
    } else {
      score += 2;
    }

    // Screen resolution (0-15 points)
    const totalPixels = info.screen.width * info.screen.height * info.screen.pixelRatio;
    if (totalPixels >= 8000000) {
      // 4K+
      score += 15;
    } else if (totalPixels >= 4000000) {
      // 1440p+
      score += 12;
    } else if (totalPixels >= 2000000) {
      // 1080p+
      score += 8;
    } else {
      score += 4;
    }

    // Device type penalty (0-5 points)
    if (info.device.type === 'desktop') {
      score += 5;
    } else if (info.device.type === 'tablet') {
      score += 3;
    } else {
      score += 0; // Mobile gets no bonus
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get device performance tier
   */
  getPerformanceTier(): 'low' | 'medium' | 'high' {
    const score = this.getDeviceScore();

    if (score >= 70) {
      return 'high';
    } else if (score >= 40) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Check apakah device low-end
   */
  isLowEndDevice(): boolean {
    return this.getPerformanceTier() === 'low';
  }

  /**
   * Reset cached device info (untuk testing)
   */
  reset(): void {
    this.deviceInfo = null;
  }
}

// Export singleton instance untuk convenience
export const deviceDetector = DeviceDetector.getInstance();
