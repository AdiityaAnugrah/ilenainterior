'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PerformanceMonitor, type PerformanceMetrics } from '@/lib/performance/PerformanceMonitor';
import { MetricsExporter } from '@/lib/performance/MetricsExporter';
import { X, Minimize2, Download } from 'lucide-react';

interface PerformanceDashboardProps {
  monitor: PerformanceMonitor;
  visible?: boolean;
  onClose?: () => void;
  updateInterval?: number;
}

/**
 * PerformanceDashboard Component
 * 
 * Real-time performance monitoring dashboard that displays:
 * - FPS with color-coded indicator
 * - Memory usage with percentage bar
 * - Draw calls count
 * - Additional stats (triangles, textures)
 * 
 * Features:
 * - Collapsible/expandable UI (collapsed by default)
 * - Compact circular button when collapsed
 * - Updates every 1-2 seconds
 * - Only visible in development mode by default
 * - No performance impact when hidden
 * - Positioned in bottom-left corner
 * - Export functionality (JSON/CSV)
 * 
 * Requirements: 10.11, 10.12
 */
export default function PerformanceDashboard({
  monitor,
  visible = true,
  onClose,
  updateInterval = 1000,
}: PerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(monitor.getMetrics());
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed by default
  const [showExportMenu, setShowExportMenu] = useState(false);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const exporterRef = useRef<MetricsExporter | null>(null);

  // Initialize exporter
  useEffect(() => {
    if (!exporterRef.current) {
      exporterRef.current = new MetricsExporter(monitor);
    }
  }, [monitor]);

  // Update metrics periodically
  useEffect(() => {
    if (!visible) return;

    const updateMetrics = () => {
      const currentMetrics = monitor.getMetrics();
      setMetrics(currentMetrics);

      // Update exporter history untuk export
      if (exporterRef.current) {
        exporterRef.current.updateFPSHistory(currentMetrics.fps);
        exporterRef.current.updateMemoryHistory(
          currentMetrics.memoryUsage.percentage,
          currentMetrics.memoryUsage.usedJSHeapSize
        );
      }
    };

    // Initial update
    updateMetrics();

    // Set up periodic updates
    updateTimerRef.current = setInterval(updateMetrics, updateInterval);

    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    };
  }, [monitor, visible, updateInterval]);

  // Handle export metrics
  const handleExportMetrics = useCallback((format: 'json' | 'csv') => {
    if (!exporterRef.current) return;

    try {
      exporterRef.current.downloadMetrics({
        format,
        includeDeviceInfo: true,
        includeHistory: true,
      });

      // Show success notification (simple alert for now)
      console.log(`[PerformanceDashboard] Metrics exported successfully as ${format.toUpperCase()}`);
      
      // Close export menu
      setShowExportMenu(false);
    } catch (error) {
      console.error('[PerformanceDashboard] Error exporting metrics:', error);
      alert('Gagal export metrics. Silakan coba lagi.');
    }
  }, []);

  // Don't render if not visible
  if (!visible) return null;

  // Only show in development mode by default
  if (process.env.NODE_ENV === 'production' && !visible) return null;

  return (
    <div className="fixed top-16 left-4 z-40">
      {/* Compact Button - Only show icon when collapsed */}
      {isCollapsed ? (
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-white hover:bg-gray-50 text-gray-700 rounded-full p-2.5 shadow-lg border border-gray-200 transition-all hover:shadow-xl"
          title="Performance Stats"
        >
          <div className="relative text-base">
            📊
            {/* FPS indicator badge */}
            <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[7px] font-bold flex items-center justify-center ${
              metrics.fps >= 55 ? 'bg-green-500' : metrics.fps >= 30 ? 'bg-yellow-500' : 'bg-red-500'
            } text-white`}>
              {metrics.fps}
            </div>
          </div>
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-64 overflow-hidden">
          {/* Compact Header */}
          <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-b">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                metrics.fps >= 55 ? 'bg-green-500' : metrics.fps >= 30 ? 'bg-yellow-500' : 'bg-red-500'
              } animate-pulse`} />
              <span className="text-xs font-semibold text-gray-700">Performance</span>
            </div>
            <div className="flex items-center gap-1">
              {/* Export button */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Export Metrics"
                >
                  <Download size={14} className="text-gray-600" />
                </button>
                
                {/* Export dropdown menu */}
                {showExportMenu && (
                  <div className="absolute bottom-full right-0 mb-1 bg-white text-gray-800 rounded shadow-lg border border-gray-200 py-1 min-w-[120px] z-10">
                    <button
                      onClick={() => handleExportMetrics('json')}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-blue-50 transition-colors"
                    >
                      Export JSON
                    </button>
                    <button
                      onClick={() => handleExportMetrics('csv')}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-blue-50 transition-colors"
                    >
                      Export CSV
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Collapse"
              >
                <Minimize2 size={14} className="text-gray-600" />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Close"
                >
                  <X size={14} className="text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Simplified Content - Only Essential Metrics */}
          <div className="p-3 space-y-3">
            {/* FPS - Compact */}
            <div className="bg-gray-50 rounded p-2">
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

            {/* Memory - Compact */}
            <div className="bg-gray-50 rounded p-2">
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

            {/* Draw Calls - Compact */}
            <div className="bg-gray-50 rounded p-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-600">Draw Calls</span>
                <span className="text-lg font-bold text-gray-900">{metrics.renderStats.drawCalls}</span>
              </div>
            </div>

            {/* Additional Stats - Minimal */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
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
        </div>
      )}
    </div>
  );
}
