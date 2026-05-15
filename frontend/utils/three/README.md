# Three.js Utilities

This directory contains utility classes and functions for optimizing Three.js performance.

## TextureCache

A global singleton cache for Three.js textures using LRU (Least Recently Used) eviction policy.

### Features

- **LRU Eviction**: Automatically removes least recently used textures when cache is full
- **Memory Tracking**: Monitors total memory usage and cache statistics
- **Automatic Disposal**: Properly disposes textures when evicted to free GPU memory
- **Cache Statistics**: Tracks hit rate, miss rate, and memory usage
- **Flexible Key Generation**: Generate cache keys from any texture parameters

### Usage

```typescript
import { getTextureCache } from './utils/three/TextureCache';
import * as THREE from 'three';

// Get the singleton cache instance
const cache = getTextureCache();

// Generate a cache key from parameters
const key = cache.generateKey({
  woodType: 'oak',
  size: 512,
  quality: 'standard'
});

// Check if texture exists in cache
const cachedTexture = cache.getCachedTexture(key);

if (cachedTexture) {
  // Use cached texture
  material.map = cachedTexture;
} else {
  // Generate new texture
  const newTexture = generateWoodTexture('oak', 512);
  
  // Store in cache for future use
  cache.setCachedTexture(key, newTexture);
  
  material.map = newTexture;
}

// Get cache statistics
const stats = cache.getStats();
console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
console.log(`Memory usage: ${(stats.totalMemoryUsage / 1024 / 1024).toFixed(2)} MB`);
console.log(`Cached textures: ${stats.entryCount}`);
```

### Configuration

```typescript
// Create cache with custom max size (default is 50)
const cache = getTextureCache(100);
```

### Cache Management

```typescript
// Remove specific texture
cache.remove('texture-key');

// Clear entire cache
cache.clear();

// Check cache size
const size = cache.size();

// Check if key exists
const exists = cache.has('texture-key');

// Get all cache keys
const keys = cache.keys();
```

### Performance Goals

- **Cache Hit Rate**: >50% for repeated textures, 80% for common presets
- **Memory Reduction**: 40-50% reduction through texture reuse
- **GPU Optimization**: Automatic texture disposal prevents memory leaks

### Integration with Procedural Textures

```typescript
import { getTextureCache } from './utils/three/TextureCache';
import { ProceduralTextureGenerator } from './utils/proceduralTextures';

function getOrCreateWoodTexture(woodType: string, size: number = 512) {
  const cache = getTextureCache();
  const key = cache.generateKey({ woodType, size, quality: 'standard' });
  
  let texture = cache.getCachedTexture(key);
  
  if (!texture) {
    const generator = new ProceduralTextureGenerator();
    texture = generator.generateWoodTexturePreset(woodType, size);
    cache.setCachedTexture(key, texture);
  }
  
  return texture;
}
```

### Testing

Run tests with:
```bash
npm test -- TextureCache.test.ts --run
```

### Requirements

Validates requirements:
- **1.6**: Texture regeneration optimization through caching
- **2.6**: Global texture cache implementation with >50% hit rate
- **3.6**: Dynamic texture generation preservation
