import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Canvas } from 'canvas';

// Polyfill ResizeObserver for jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill HTMLCanvasElement for canvas texture generation in tests
if (typeof HTMLCanvasElement !== 'undefined') {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement, contextType: any, ...args: any[]): any {
    if (contextType === '2d') {
      // Create a node-canvas instance
      const canvas = new Canvas(this.width || 300, this.height || 150);
      return canvas.getContext('2d');
    }
    return originalGetContext.call(this, contextType as any, ...args);
  } as any;
}

// Cleanup after each test case
afterEach(() => {
  cleanup();
});
