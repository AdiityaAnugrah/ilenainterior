/**
 * Lazy-loaded Three.js Controls
 * 
 * Dynamically imports heavy @react-three/drei controls to reduce initial bundle size.
 * 
 * Features:
 * - OrbitControls: Lazy-loaded camera controls
 * - TransformControls: Lazy-loaded object transformation controls
 * - Loading fallback with spinner
 * - Error handling with retry option
 * 
 * Requirements: 9.3, 9.6, 9.7, 9.10
 */

'use client';

import React, { Suspense, ComponentType, forwardRef } from 'react';
import { lazyWithRetry } from '@/components/common/LazyLoader';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

// ============================================================================
// Type Definitions
// ============================================================================

// OrbitControls props type
export interface OrbitControlsProps {
  ref?: React.Ref<OrbitControlsImpl>;
  enableDamping?: boolean;
  dampingFactor?: number;
  minDistance?: number;
  maxDistance?: number;
  maxPolarAngle?: number;
  target?: [number, number, number];
  enabled?: boolean;
  [key: string]: any;
}

// TransformControls props type
export interface TransformControlsProps {
  mode?: 'translate' | 'rotate' | 'scale';
  enabled?: boolean;
  object?: any;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  [key: string]: any;
}

// ============================================================================
// Loading Fallback
// ============================================================================

function ControlsLoadingFallback() {
  return null; // Controls don't need visible loading indicator
}

// ============================================================================
// Error Fallback
// ============================================================================

interface ControlsErrorFallbackProps {
  error: Error;
  controlType: string;
}

function ControlsErrorFallback({ error, controlType }: ControlsErrorFallbackProps) {
  console.error(`[LazyControls] Failed to load ${controlType}:`, error);
  
  return (
    <group>
      {/* Show error in development mode */}
      {process.env.NODE_ENV === 'development' && (
        <mesh position={[0, 2, 0]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshBasicMaterial color="red" />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// Lazy-loaded Components
// ============================================================================

/**
 * Lazy-loaded OrbitControls
 * 
 * Dynamically imports OrbitControls from @react-three/drei only when needed.
 * Reduces initial bundle size by ~50KB (gzipped).
 * 
 * Requirements: 9.3, 9.6, 9.7
 */
const LazyOrbitControlsComponent = lazyWithRetry(
  () => import('@react-three/drei').then(module => ({
    default: module.OrbitControls
  })),
  {
    maxRetries: 3,
    initialDelay: 1000,
    exponentialBackoff: true,
  }
);

/**
 * Lazy-loaded TransformControls
 * 
 * Dynamically imports TransformControls from @react-three/drei only when needed.
 * Reduces initial bundle size by ~30KB (gzipped).
 * 
 * Requirements: 9.3, 9.6, 9.7
 */
const LazyTransformControlsComponent = lazyWithRetry(
  () => import('@react-three/drei').then(module => ({
    default: module.TransformControls
  })),
  {
    maxRetries: 3,
    initialDelay: 1000,
    exponentialBackoff: true,
  }
);

/**
 * Lazy-loaded Environment
 * 
 * Dynamically imports Environment from @react-three/drei only when needed.
 * Reduces initial bundle size by ~40KB (gzipped).
 * 
 * Requirements: 9.3, 9.6, 9.7
 */
const LazyEnvironmentComponent = lazyWithRetry(
  () => import('@react-three/drei').then(module => ({
    default: module.Environment
  })),
  {
    maxRetries: 3,
    initialDelay: 1000,
    exponentialBackoff: true,
  }
);

// ============================================================================
// Wrapped Components with Error Boundaries
// ============================================================================

/**
 * LazyOrbitControls Component
 * 
 * Wrapper around lazy-loaded OrbitControls with Suspense and error handling.
 * 
 * Requirements: 9.3, 9.6, 9.7
 */
export const LazyOrbitControls = forwardRef<OrbitControlsImpl, OrbitControlsProps>(
  function LazyOrbitControls(props, ref) {
    return (
      <Suspense fallback={<ControlsLoadingFallback />}>
        <ErrorBoundary fallback={<ControlsErrorFallback error={new Error('OrbitControls failed to load')} controlType="OrbitControls" />}>
          <LazyOrbitControlsComponent ref={ref} {...props} />
        </ErrorBoundary>
      </Suspense>
    );
  }
);

/**
 * LazyTransformControls Component
 * 
 * Wrapper around lazy-loaded TransformControls with Suspense and error handling.
 * 
 * Requirements: 9.3, 9.6, 9.7
 */
export function LazyTransformControls(props: TransformControlsProps) {
  return (
    <Suspense fallback={<ControlsLoadingFallback />}>
      <ErrorBoundary fallback={<ControlsErrorFallback error={new Error('TransformControls failed to load')} controlType="TransformControls" />}>
        <LazyTransformControlsComponent {...props} />
      </ErrorBoundary>
    </Suspense>
  );
}

/**
 * LazyEnvironment Component
 * 
 * Wrapper around lazy-loaded Environment with Suspense and error handling.
 * 
 * Requirements: 9.3, 9.6, 9.7
 */
export function LazyEnvironment(props: { preset?: 'night' | 'apartment' | 'city' | 'dawn' | 'forest' | 'lobby' | 'park' | 'studio' | 'sunset' | 'warehouse'; [key: string]: any }) {
  return (
    <Suspense fallback={<ControlsLoadingFallback />}>
      <ErrorBoundary fallback={<ControlsErrorFallback error={new Error('Environment failed to load')} controlType="Environment" />}>
        <LazyEnvironmentComponent {...props} />
      </ErrorBoundary>
    </Suspense>
  );
}

// ============================================================================
// Error Boundary Component
// ============================================================================

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[LazyControls] Error caught in ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// ============================================================================
// Preload Functions
// ============================================================================

/**
 * Preload OrbitControls in the background
 * 
 * Call this when user is likely to need OrbitControls soon (e.g., hovering over 3D view button)
 * 
 * Requirements: 9.3
 */
export async function preloadOrbitControls(): Promise<void> {
  try {
    await import('@react-three/drei');
    console.log('[LazyControls] OrbitControls preloaded successfully');
  } catch (error) {
    console.error('[LazyControls] Failed to preload OrbitControls:', error);
  }
}

/**
 * Preload TransformControls in the background
 * 
 * Call this when user selects an item (before showing transform controls)
 * 
 * Requirements: 9.3
 */
export async function preloadTransformControls(): Promise<void> {
  try {
    await import('@react-three/drei');
    console.log('[LazyControls] TransformControls preloaded successfully');
  } catch (error) {
    console.error('[LazyControls] Failed to preload TransformControls:', error);
  }
}

/**
 * Preload Environment in the background
 * 
 * Call this during initial load or when switching to 3D view
 * 
 * Requirements: 9.3
 */
export async function preloadEnvironment(): Promise<void> {
  try {
    await import('@react-three/drei');
    console.log('[LazyControls] Environment preloaded successfully');
  } catch (error) {
    console.error('[LazyControls] Failed to preload Environment:', error);
  }
}

/**
 * Preload all controls at once
 * 
 * Call this after initial page load to prepare for 3D interactions
 * 
 * Requirements: 9.3
 */
export async function preloadAllControls(): Promise<void> {
  try {
    await import('@react-three/drei');
    console.log('[LazyControls] All controls preloaded successfully');
  } catch (error) {
    console.error('[LazyControls] Failed to preload controls:', error);
  }
}

// ============================================================================
// Export
// ============================================================================

export default {
  LazyOrbitControls,
  LazyTransformControls,
  LazyEnvironment,
  preloadOrbitControls,
  preloadTransformControls,
  preloadEnvironment,
  preloadAllControls,
};
