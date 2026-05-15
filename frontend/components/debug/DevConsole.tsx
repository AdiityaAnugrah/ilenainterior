'use client';

import React, { useState } from 'react';
import { PerformanceMonitor } from '@/lib/performance/PerformanceMonitor';
import { QualityManager, type QualityLevel } from '@/lib/quality/QualityManager';
import { deviceDetector } from '@/lib/performance/DeviceDetector';
import { Settings, Activity, X, Minimize2, ChevronDown, AlertTriangle, Download } from 'lucide-react';
import { MetricsExporter } from '@/lib/performance/MetricsExporter';

interface DevConsoleProps {
  performanceMonitor: PerformanceMonitor;
  qualityManager: QualityManager;
  onQualityChange: (level: QualityLevel) => void;
}

type TabType = 'performance' | 'quality';

/**
 * DevConsole Component
 * 
 * Unified developer console untuk Performance monitoring dan Quality settings.
 * Menggunakan tab interface untuk switch antara Performance dan Quality.
 * 
 * Features:
 * - Tab-based interface (Performance / Quality)
 * - Collapsible panel
 * - Compact design
 * - Export functionality
 * - Real-time metrics
 */
export default function DevConsole({
  performanceMonitor,
  qualityManager,
  onQualityChange,
}: DevConsoleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('performance');
  const [metrics, setMetrics] = useState(performanceMonitor.getMetrics());
  const [currentQuality, setCurrentQuality] = useState<QualityLevel>(qualityManager.getQuality());
  const [deviceScore] = useState(deviceDetector.getDeviceScore());
  const [performanceTier] = useState(deviceDetector.getPerformanceTier());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exporterRef = React.useRef<MetricsExporter | null>(null);

  // Initialize exporter
  React.useEffect(() => {
    if (!exporterRef.current) {
      exporterRef.current = new MetricsExporter(performanceMonitor);
    }
  }, [performanceMonitor]);

  // Update metrics periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
      const newQuality = qualityManager.getQuality();
      if (newQuality !== currentQuality) {
        setCurrentQuality(newQuality);
      }

      // Update exporter history
      if (exporterRef.current) {
        const m = performanceMonitor.getMetrics();
        exporterRef.current.updateFPSHistory(m.fps);
        exporterRef.current.updateMemoryHistory(m.memoryUsage.percentage, m.memoryUsage.usedJSHeapSize);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [performanceMonitor, qualityManager, currentQuality]);

  const handleQualityChange = (level: QualityLevel) => {
    if (performanceTier === 'low' && (level === 'HIGH' || level === 'ULTRA')) {
      const confirmed = window.confirm(
        'Device Anda memiliki performa terbatas. Menggunakan quality tinggi dapat menyebabkan lag. Lanjutkan?'
      );
      if (!confirmed) return;
    }

    qualityManager.setManualOverride(level);
    setCurrentQuality(level);
    onQualityChange(level);
  };

  const handleExportMetrics = (format: 'json' | 'csv') => {
    if (!exporterRef.current) return;

    try {
      exporterRef.current.downloadMetrics({
        format,
        includeDeviceInfo: true,
        includeHistory: true,
      });
      console.log(`[DevConsole] Metrics exported as ${format.toUpperCase()}`);
      setShowExportMenu(false);
    } catch (error) {
      console.error('[DevConsole] Export error:', error);
      alert('Gagal export metrics.');
    }
  };

  const getQualityColor = (level: QualityLevel): string => {
    switch (level) {
      case 'LOW': return 'text-red-600 bg-red-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'HIGH': return 'text-green-600 bg-green-50';
      case 'ULTRA': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getDeviceTierColor = (tier: 'low' | 'medium' | 'high'): string => {
    switch (tier) {
      case 'low': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getDeviceTierLabel = (tier: 'low' | 'medium' | 'high'): string => {
    switch (tier) {
      case 'low': return 'Rendah';
      case 'medium': return 'Sedang';
      case 'high': return 'Tinggi';
      default: return 'Unknown';
    }
  };

  const isInDegradationMode = qualityManager.isInDegradationMode();

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-[304px] z-50 bg-white hover:bg-gray-50 text-gray-700 rounded-full p-2.5 shadow-lg border border-gray-200 transition-all hover:shadow-xl group"
        title="Dev Console"
      >
        <div className="relative">
          <Activity size={16} className="text-gray-700" />
          {/* FPS Badge */}
          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center ${
            metrics.fps >= 55 ? 'bg-green-500' : metrics.fps >= 30 ? 'bg-yellow-500' : 'bg-red-500'
          } text-white shadow-sm`}>
            {metrics.fps}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-[304px] z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-80 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-gray-600" />
          <span className="text-xs font-semibold text-gray-700">Dev Console</span>
        </div>
        <div className="flex items-center gap-1">
          {activeTab === 'performance' && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Export Metrics"
              >
                <Download size={14} className="text-gray-600" />
              </button>
              
              {showExportMenu && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded shadow-lg border border-gray-200 py-1 min-w-[120px] z-10">
                  <button
                    onClick={() => handleExportMetrics('json')}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-blue-50 transition-colors"
                  >
                    Export JSON
                  </button>
                  <button
                    onClick={() => handleExportMetrics('csv')}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-blue-50 transition-colors"
                  >
                    Export CSV
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Close"
          >
            <X size={14} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setActiveTab('performance')}
          className={`flex-1 px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'performance'
              ? 'bg-white text-gray-900 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Performance
        </button>
        <button
          onClick={() => setActiveTab('quality')}
          className={`flex-1 px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'quality'
              ? 'bg-white text-gray-900 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Quality
        </button>
      </div>

      {/* Content */}
      <div className="p-3 max-h-[400px] overflow-y-auto bg-white">
        {activeTab === 'performance' ? (
          <div className="space-y-3">
            {/* FPS */}
            <div className="bg-gray-50 rounded p-2 border border-gray-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-gray-600">FPS</span>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${
                    metrics.fps >= 55 ? 'text-green-600' : metrics.fps >= 30 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {metrics.fps}
                  </span>
                  <span className="text-xs text-gray-500">avg: {metrics.avgFps}</span>
                </div>
              </div>
            </div>

            {/* Memory */}
            <div className="bg-gray-50 rounded p-2 border border-gray-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-gray-600">Memory</span>
                <span className={`text-lg font-bold ${
                  metrics.memoryUsage.percentage < 60 ? 'text-green-600' : 
                  metrics.memoryUsage.percentage < 80 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {metrics.memoryUsage.percentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    metrics.memoryUsage.percentage < 60 ? 'bg-green-500' : 
                    metrics.memoryUsage.percentage < 80 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${metrics.memoryUsage.percentage}%` }}
                />
              </div>
            </div>

            {/* Draw Calls */}
            <div className="bg-gray-50 rounded p-2 border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-600">Draw Calls</span>
                <span className="text-lg font-bold text-gray-900">{metrics.renderStats.drawCalls}</span>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
              <div className="text-center">
                <div className="text-xs text-gray-500">Triangles</div>
                <div className="text-sm font-bold text-gray-900">
                  {(metrics.renderStats.triangles / 1000).toFixed(1)}k
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Textures</div>
                <div className="text-sm font-bold text-gray-900">{metrics.renderStats.textures}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Current Quality */}
            <div className="bg-gray-50 rounded p-2 border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-600">Current Quality</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${getQualityColor(currentQuality)}`}>
                  {currentQuality}
                </span>
              </div>
            </div>

            {/* Degradation Warning */}
            {isInDegradationMode && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2 flex items-center gap-2">
                <AlertTriangle size={14} className="text-yellow-600 shrink-0" />
                <p className="text-xs text-yellow-800">Mode hemat aktif</p>
              </div>
            )}

            {/* Quality Selector */}
            <div className="grid grid-cols-2 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH', 'ULTRA'] as QualityLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => handleQualityChange(level)}
                  className={`px-3 py-2 rounded text-xs font-semibold transition-all ${
                    currentQuality === level
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            {/* Device Info */}
            <div className="bg-gray-50 rounded p-2 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Device:</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getDeviceTierColor(performanceTier)}`}>
                  {getDeviceTierLabel(performanceTier)} ({deviceScore}/100)
                </span>
              </div>
            </div>

            {/* Recommendations */}
            {performanceTier === 'low' && (
              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                <p className="text-xs font-semibold text-blue-900 mb-1">💡 Tips:</p>
                <p className="text-xs text-blue-800">Gunakan LOW atau MEDIUM untuk performa terbaik</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
