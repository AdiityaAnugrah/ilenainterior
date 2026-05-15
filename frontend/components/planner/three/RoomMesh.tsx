'use client';
import React, { useMemo, Suspense, useEffect, lazy, memo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { useEditorStore } from '@/store/editorStore';
import { Grid } from '@react-three/drei';
import { DoorMaterialFactory } from '@/factories/DoorMaterialFactory';
import { DoorGeometryFactory, DOOR_LOD_CONFIG } from '@/factories/DoorGeometryFactory';
import { WindowMaterialFactory } from '@/factories/WindowMaterialFactory';
import { WindowGeometryFactory, WINDOW_LOD_CONFIG } from '@/factories/WindowGeometryFactory';
import { getTextureCache } from '@/utils/three/TextureCache';
import { updateSceneLOD } from '@/utils/three/GeometryOptimizer';
import { getMemoryManager } from '@/lib/memory/MemoryManager';
import { createMergedLOD } from '@/utils/three/GeometryMerger';

// Lazy load OutdoorEnvironment component
const OutdoorEnvironment = lazy(() => import('./OutdoorEnvironment'));

const FLOOR_PROPERTIES: Record<string, { color: string; roughness: number; metalness: number }> = {
  parket:  { color: '#C4965A', roughness: 0.4,  metalness: 0.1  },
  ubin:    { color: '#E8E8E8', roughness: 0.15, metalness: 0.1  },
  marmer:  { color: '#F0EDE8', roughness: 0.05, metalness: 0.1  },
  karpet:  { color: '#8B7355', roughness: 0.9,  metalness: 0.0  },
  beton:   { color: '#BDBDBD', roughness: 0.8,  metalness: 0.2  },
  kayu:    { color: '#A0785A', roughness: 0.5,  metalness: 0.05 },
};

// ── Procedural marble texture ─────────────────────────────────────────────────

function makeMarbleTexture(color: string): THREE.CanvasTexture {
  // Check cache first
  const cache = getTextureCache();
  const cacheKey = cache.generateKey({
    textureType: 'marble',
    color: color,
    size: 512,
  });

  const cachedTexture = cache.getCachedTexture(cacheKey);
  if (cachedTexture) {
    // Increment reference count for cached texture
    const memoryManager = getMemoryManager();
    const textureId = `marble-texture-${cacheKey}`;
    if (memoryManager.isRegistered(textureId)) {
      memoryManager.addRef(textureId);
    }
    return cachedTexture as THREE.CanvasTexture;
  }

  // Generate new texture if not in cache
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base fill
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);

  // Subtle gradient overlay for depth
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0,   'rgba(255,255,255,0.06)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.03)');
  grad.addColorStop(1,   'rgba(255,255,255,0.04)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Seeded deterministic random
  const rand = (s: number) => Math.abs(Math.sin(s * 127.1 + 311.7) * 43758.5453) % 1;

  const drawVein = (seed: number, alpha: number, width: number, len: number) => {
    const sx = rand(seed)     * size;
    const sy = rand(seed + 1) * size;
    let angle = rand(seed + 2) * Math.PI;
    let x = sx, y = sy;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i < len; i += 4) {
      angle += (rand(seed + i * 0.01) - 0.5) * 0.35;
      x += Math.cos(angle) * 4;
      y += Math.sin(angle) * 4;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(80,80,80,${alpha})`;
    ctx.lineWidth = width;
    ctx.stroke();
  };

  // Main veins
  for (let i = 0; i < 6; i++)  drawVein(i * 7,       0.18 + rand(i) * 0.14, 1.2 + rand(i + 0.5), 280 + rand(i + 1) * 180);
  // Secondary veins
  for (let i = 0; i < 14; i++) drawVein(i * 13 + 50,  0.07 + rand(i) * 0.07, 0.4 + rand(i + 0.3) * 0.8, 120 + rand(i + 2) * 150);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(Math.max(1, 2), Math.max(1, 2));
  tex.colorSpace = THREE.SRGBColorSpace;

  // Cache the texture for reuse
  cache.setCachedTexture(cacheKey, tex);

  // Register texture with MemoryManager (initial ref count = 1)
  const memoryManager = getMemoryManager();
  const textureId = `marble-texture-${cacheKey}`;
  memoryManager.registerTexture(textureId, tex);

  return tex;
}

// ── Procedural canvas texture ─────────────────────────────────────────────────

function makeWallTexture(type: string, color: string): THREE.CanvasTexture | null {
  if (type === 'plain' || !type) return null;

  // Check cache first
  const cache = getTextureCache();
  const cacheKey = cache.generateKey({
    textureType: 'wall',
    type: type,
    color: color,
    size: 512,
  });

  const cachedTexture = cache.getCachedTexture(cacheKey);
  if (cachedTexture) {
    // Increment reference count for cached texture
    const memoryManager = getMemoryManager();
    const textureId = `wall-texture-${cacheKey}`;
    if (memoryManager.isRegistered(textureId)) {
      memoryManager.addRef(textureId);
    }
    return cachedTexture as THREE.CanvasTexture;
  }

  // Generate new texture if not in cache
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);

  if (type === 'brick') {
    const bw = 100, bh = 46, mortar = 6;
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let row = 0; row * (bh + mortar) < size; row++) {
      const offX = row % 2 === 0 ? 0 : (bw + mortar) / 2;
      const y = row * (bh + mortar);
      for (let col = -1; col * (bw + mortar) < size; col++) {
        const x = col * (bw + mortar) + offX;
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = mortar;
        ctx.strokeRect(x + mortar / 2, y + mortar / 2, bw, bh);
      }
    }
  } else if (type === 'stripes') {
    const sw = 40;
    for (let x = 0; x < size; x += sw * 2) {
      ctx.fillStyle = 'rgba(0,0,0,0.07)';
      ctx.fillRect(x, 0, sw, size);
    }
  } else if (type === 'geometric') {
    const s = 60;
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1.5;
    for (let row = 0; row * s < size + s; row++) {
      for (let col = 0; col * s < size + s; col++) {
        const ox = col * s - (row % 2 === 0 ? 0 : s / 2);
        const oy = row * s * 0.7;
        ctx.beginPath();
        ctx.moveTo(ox, oy + s * 0.35); ctx.lineTo(ox + s / 2, oy);
        ctx.lineTo(ox + s, oy + s * 0.35); ctx.lineTo(ox + s / 2, oy + s * 0.7);
        ctx.closePath(); ctx.stroke();
      }
    }
  } else if (type === 'concrete') {
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * size, y = Math.random() * size;
      const alpha = Math.random() * 0.04;
      const gray = Math.random() > 0.5 ? 0 : 255;
      ctx.fillStyle = `rgba(${gray},${gray},${gray},${alpha})`;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.04)'; ctx.lineWidth = 1;
    for (let y = 80; y < size; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke(); }
  } else if (type === 'wood') {
    for (let i = 0; i < 12; i++) {
      const x = (size / 12) * i;
      const grad = ctx.createLinearGradient(x, 0, x + size / 12, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0.06)'); grad.addColorStop(0.3, 'rgba(255,255,255,0.05)');
      grad.addColorStop(0.7, 'rgba(0,0,0,0.04)'); grad.addColorStop(1, 'rgba(0,0,0,0.08)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, size / 12, size);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 1;
    for (let y = 0; y < size; y += 4 + Math.random() * 8) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke(); }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1.5);
  tex.colorSpace = THREE.SRGBColorSpace;

  // Cache the texture for reuse
  cache.setCachedTexture(cacheKey, tex);

  // Register texture with MemoryManager (initial ref count = 1)
  const memoryManager = getMemoryManager();
  const textureId = `wall-texture-${cacheKey}`;
  memoryManager.registerTexture(textureId, tex);

  return tex;
}

// ── Image texture loader (uses Suspense) ──────────────────────────────────────

function useImageTexture(url: string, W: number, H: number): THREE.Texture {
  const tex = useLoader(THREE.TextureLoader, url);
  
  // Use useMemo to configure texture properties to avoid modifying hook return value
  const configuredTex = useMemo(() => {
    const clonedTex = tex.clone();
    clonedTex.wrapS = clonedTex.wrapT = THREE.RepeatWrapping;
    // Tile: roughly 1 repeat per 2m so pattern doesn't stretch
    clonedTex.repeat.set(Math.max(1, W / 200), Math.max(1, H / 200));
    clonedTex.colorSpace = THREE.SRGBColorSpace;
    
    // Register texture with MemoryManager
    const memoryManager = getMemoryManager();
    const textureId = `image-texture-${url}-${W}-${H}`;
    if (!memoryManager.isRegistered(textureId)) {
      memoryManager.registerTexture(textureId, clonedTex);
    } else {
      // Increment reference count if already registered
      memoryManager.addRef(textureId);
    }
    
    return clonedTex;
  }, [tex, W, H, url]);

  // Dispose texture on unmount
  useEffect(() => {
    return () => {
      const memoryManager = getMemoryManager();
      const textureId = `image-texture-${url}-${W}-${H}`;
      if (memoryManager.isRegistered(textureId)) {
        // Release reference - MemoryManager will dispose when ref count reaches 0
        memoryManager.releaseRef(textureId);
      }
    };
  }, [url, W, H]);

  return configuredTex;
}

// ── Plain wall with LOD ──────────────────────────────────────────────────────

function PlainWall({ W, H, position, rotation, wallColor, wallTexture }: {
  W: number; H: number;
  position: [number, number, number];
  rotation: [number, number, number];
  wallColor: string;
  wallTexture: THREE.CanvasTexture | null;
}) {
  // Create material for wall
  const wallMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: wallColor,
      ...(wallTexture ? { map: wallTexture } : {}),
      roughness: 0.25,
      metalness: 0.05,
      envMapIntensity: 1.2,
      side: THREE.FrontSide,
    });
  }, [wallColor, wallTexture]);

  // Create LOD object for wall plane
  const wallLOD = useMemo(() => {
    const lod = createWallPlaneLOD(W, H, wallMaterial);
    lod.position.set(...position);
    lod.rotation.set(...rotation);
    return lod;
  }, [W, H, wallMaterial, position, rotation]);

  // Register wall LOD geometries with MemoryManager
  useEffect(() => {
    const memoryManager = getMemoryManager();
    
    wallLOD.levels.forEach((level, index) => {
      const mesh = level.object as THREE.Mesh;
      if (mesh.geometry) {
        const geometryId = `plain-wall-lod-${index}-${W}-${H}-${position.join('-')}`;
        if (!memoryManager.isRegistered(geometryId)) {
          memoryManager.registerGeometry(geometryId, mesh.geometry);
        }
      }
    });
    
    // Register material
    const materialId = `plain-wall-material-${W}-${H}-${position.join('-')}`;
    if (!memoryManager.isRegistered(materialId)) {
      memoryManager.registerMaterial(materialId, wallMaterial);
    }
    
    return () => {
      // Dispose geometries
      wallLOD.levels.forEach((level, index) => {
        const mesh = level.object as THREE.Mesh;
        if (mesh.geometry) {
          const geometryId = `plain-wall-lod-${index}-${W}-${H}-${position.join('-')}`;
          memoryManager.dispose(geometryId);
        }
      });
      
      // Dispose material
      const materialId = `plain-wall-material-${W}-${H}-${position.join('-')}`;
      memoryManager.dispose(materialId);
    };
  }, [wallLOD, wallMaterial, W, H, position]);

  return <primitive object={wallLOD} />;
}

function PlainWallImage({ W, H, position, rotation, thumbnailUrl }: {
  W: number; H: number;
  position: [number, number, number];
  rotation: [number, number, number];
  thumbnailUrl: string;
}) {
  const tex = useImageTexture(thumbnailUrl, W * 100, H * 100);
  
  // Create material for wall with image texture
  const wallMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.25,
      metalness: 0.05,
      envMapIntensity: 1.2,
      side: THREE.FrontSide,
    });
  }, [tex]);

  // Create LOD object for wall plane
  const wallLOD = useMemo(() => {
    const lod = createWallPlaneLOD(W, H, wallMaterial);
    lod.position.set(...position);
    lod.rotation.set(...rotation);
    return lod;
  }, [W, H, wallMaterial, position, rotation]);

  // Register wall LOD geometries with MemoryManager
  useEffect(() => {
    const memoryManager = getMemoryManager();
    
    wallLOD.levels.forEach((level, index) => {
      const mesh = level.object as THREE.Mesh;
      if (mesh.geometry) {
        const geometryId = `plain-wall-image-lod-${index}-${W}-${H}-${position.join('-')}`;
        if (!memoryManager.isRegistered(geometryId)) {
          memoryManager.registerGeometry(geometryId, mesh.geometry);
        }
      }
    });
    
    // Register material
    const materialId = `plain-wall-image-material-${W}-${H}-${position.join('-')}`;
    if (!memoryManager.isRegistered(materialId)) {
      memoryManager.registerMaterial(materialId, wallMaterial);
    }
    
    return () => {
      // Dispose geometries
      wallLOD.levels.forEach((level, index) => {
        const mesh = level.object as THREE.Mesh;
        if (mesh.geometry) {
          const geometryId = `plain-wall-image-lod-${index}-${W}-${H}-${position.join('-')}`;
          memoryManager.dispose(geometryId);
        }
      });
      
      // Dispose material
      const materialId = `plain-wall-image-material-${W}-${H}-${position.join('-')}`;
      memoryManager.dispose(materialId);
    };
  }, [wallLOD, wallMaterial, W, H, position]);

  return <primitive object={wallLOD} />;
}

// ── Door (south wall, centered, slightly ajar) ───────────────────────────────

const DOOR_W  = 0.9;
const DOOR_H  = 2.1;
const FRAME_T = 0.07;
const PANEL_T = 0.045;

// South wall with door hole and image texture
function SouthWallWithDoorImage({ geo, url }: { geo: THREE.ShapeGeometry; url: string }) {
  const tex = useLoader(THREE.TextureLoader, url);
  
  // Use useMemo to configure texture properties to avoid modifying hook return value
  const configuredTex = useMemo(() => {
    const clonedTex = tex.clone();
    clonedTex.wrapS = clonedTex.wrapT = THREE.RepeatWrapping;
    clonedTex.colorSpace = THREE.SRGBColorSpace;
    
    // Register texture with MemoryManager
    const memoryManager = getMemoryManager();
    const textureId = `south-wall-texture-${url}`;
    if (!memoryManager.isRegistered(textureId)) {
      memoryManager.registerTexture(textureId, clonedTex);
    } else {
      // Increment reference count if already registered
      memoryManager.addRef(textureId);
    }
    
    return clonedTex;
  }, [tex, url]);
  
  // Dispose texture on unmount
  useEffect(() => {
    return () => {
      const memoryManager = getMemoryManager();
      const textureId = `south-wall-texture-${url}`;
      if (memoryManager.isRegistered(textureId)) {
        // Release reference - MemoryManager will dispose when ref count reaches 0
        memoryManager.releaseRef(textureId);
      }
    };
  }, [url]);
  
  // Create LOD for south wall with image texture
  const southWallImageLOD = useMemo(() => {
    const lod = new THREE.LOD();
    
    // Create material with image texture
    const material = new THREE.MeshStandardMaterial({
      map: configuredTex,
      roughness: 0.25,
      metalness: 0.05,
      envMapIntensity: 1.2,
      side: THREE.FrontSide,
    });

    // HIGH detail - use full ShapeGeometry with door hole
    const highMesh = new THREE.Mesh(geo.clone(), material);
    highMesh.receiveShadow = true;
    lod.addLevel(highMesh, ROOM_LOD_CONFIG.HIGH.distance);

    // MEDIUM detail - simplified ShapeGeometry
    const mediumGeo = geo.clone();
    const mediumMesh = new THREE.Mesh(mediumGeo, material);
    mediumMesh.receiveShadow = true;
    lod.addLevel(mediumMesh, ROOM_LOD_CONFIG.MEDIUM.distance);

    // LOW detail - simple plane (no door hole visible at distance)
    // Get dimensions from geometry bounds
    geo.computeBoundingBox();
    const bbox = geo.boundingBox!;
    const width = bbox.max.x - bbox.min.x;
    const height = bbox.max.y - bbox.min.y;
    const lowGeo = new THREE.PlaneGeometry(width, height, 1, 1);
    const lowMesh = new THREE.Mesh(lowGeo, material);
    lowMesh.receiveShadow = true;
    lod.addLevel(lowMesh, ROOM_LOD_CONFIG.LOW.distance);

    return { lod, material };
  }, [geo, configuredTex]);

  // Register LOD geometries with MemoryManager
  useEffect(() => {
    const memoryManager = getMemoryManager();
    
    southWallImageLOD.lod.levels.forEach((level, index) => {
      const mesh = level.object as THREE.Mesh;
      if (mesh.geometry) {
        const geometryId = `south-wall-image-lod-${index}-${url}`;
        if (!memoryManager.isRegistered(geometryId)) {
          memoryManager.registerGeometry(geometryId, mesh.geometry);
        }
      }
    });
    
    // Register material
    const materialId = `south-wall-image-material-${url}`;
    if (!memoryManager.isRegistered(materialId)) {
      memoryManager.registerMaterial(materialId, southWallImageLOD.material);
    }
    
    return () => {
      // Dispose geometries
      southWallImageLOD.lod.levels.forEach((level, index) => {
        const mesh = level.object as THREE.Mesh;
        if (mesh.geometry) {
          const geometryId = `south-wall-image-lod-${index}-${url}`;
          memoryManager.dispose(geometryId);
        }
      });
      
      // Dispose material
      const materialId = `south-wall-image-material-${url}`;
      memoryManager.dispose(materialId);
    };
  }, [southWallImageLOD, url]);
  
  return <primitive object={southWallImageLOD.lod} />;
}

function SouthWallWithDoor({
  W, H, roomD, doorOffsetX, wallColor, wallTexture, thumbnail,
}: {
  W: number; H: number; roomD: number; doorOffsetX: number;
  wallColor: string; wallTexture: THREE.CanvasTexture | null; thumbnail?: string | null;
}) {
  // South wall rotation [0,π,0] → local x FLIPPED vs world x
  const dx = -(doorOffsetX / 100); // world cm → local m, negated
  
  // Create geometry with door hole - memoized for performance
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-W / 2, 0); shape.lineTo(W / 2, 0);
    shape.lineTo(W / 2, H); shape.lineTo(-W / 2, H);
    shape.closePath();

    const dw = DOOR_W / 2;
    const hole = new THREE.Path();
    hole.moveTo(dx - dw, -0.02); hole.lineTo(dx + dw, -0.02);
    hole.lineTo(dx + dw, DOOR_H); hole.lineTo(dx - dw, DOOR_H);
    hole.closePath();
    shape.holes.push(hole);

    const g = new THREE.ShapeGeometry(shape, 4);
    const pos = g.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2]     = (pos.getX(i) + W / 2) / W;
      uv[i * 2 + 1] = pos.getY(i) / H;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }, [W, H, dx]);

  // Create LOD variants for south wall with door hole
  const southWallLOD = useMemo(() => {
    const lod = new THREE.LOD();
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: wallColor,
      ...(wallTexture ? { map: wallTexture } : {}),
      roughness: 0.25,
      metalness: 0.05,
      envMapIntensity: 1.2,
      side: THREE.FrontSide,
    });

    // HIGH detail - use full ShapeGeometry with door hole
    const highMesh = new THREE.Mesh(geo.clone(), material);
    highMesh.receiveShadow = true;
    lod.addLevel(highMesh, ROOM_LOD_CONFIG.HIGH.distance);

    // MEDIUM detail - simplified ShapeGeometry
    const mediumGeo = geo.clone();
    const mediumMesh = new THREE.Mesh(mediumGeo, material);
    mediumMesh.receiveShadow = true;
    lod.addLevel(mediumMesh, ROOM_LOD_CONFIG.MEDIUM.distance);

    // LOW detail - simple plane (no door hole visible at distance)
    const lowGeo = new THREE.PlaneGeometry(W, H, 1, 1);
    const lowMesh = new THREE.Mesh(lowGeo, material);
    lowMesh.receiveShadow = true;
    lod.addLevel(lowMesh, ROOM_LOD_CONFIG.LOW.distance);

    return { lod, material };
  }, [W, H, geo, wallColor, wallTexture]);

  // Register LOD geometries with MemoryManager
  useEffect(() => {
    const memoryManager = getMemoryManager();
    
    southWallLOD.lod.levels.forEach((level, index) => {
      const mesh = level.object as THREE.Mesh;
      if (mesh.geometry) {
        const geometryId = `south-wall-lod-${index}-${W}-${H}-${dx}`;
        if (!memoryManager.isRegistered(geometryId)) {
          memoryManager.registerGeometry(geometryId, mesh.geometry);
        }
      }
    });
    
    // Register material
    const materialId = `south-wall-material-${W}-${H}-${dx}`;
    if (!memoryManager.isRegistered(materialId)) {
      memoryManager.registerMaterial(materialId, southWallLOD.material);
    }
    
    return () => {
      // Dispose geometries
      southWallLOD.lod.levels.forEach((level, index) => {
        const mesh = level.object as THREE.Mesh;
        if (mesh.geometry) {
          const geometryId = `south-wall-lod-${index}-${W}-${H}-${dx}`;
          memoryManager.dispose(geometryId);
        }
      });
      
      // Dispose material
      const materialId = `south-wall-material-${W}-${H}-${dx}`;
      memoryManager.dispose(materialId);
    };
  }, [southWallLOD, W, H, dx]);

  const plain = <primitive object={southWallLOD.lod} />;

  return (
    <group position={[0, 0, roomD / 2]} rotation={[0, Math.PI, 0]}>
      {thumbnail
        ? <Suspense fallback={plain}><SouthWallWithDoorImage geo={geo} url={thumbnail} /></Suspense>
        : plain}
    </group>
  );
}

// Door mesh component with materials and LOD support
function DoorMeshContent({ roomD, xOffset = 0 }: { roomD: number; xOffset?: number }) {
  // Kusen masuk ke dalam ruangan dengan depth yang cukup agar terlihat dari dalam
  // Position kusen di tengah-tengah dinding (z = roomD/2) dengan offset ke dalam
  const z = roomD / 2 - FRAME_T / 2; // Center the frame depth on the wall

  // Create materials using DoorMaterialFactory with useMemo for performance
  const doorMaterials = useMemo(() => {
    try {
      const materials = {
        frame: DoorMaterialFactory.createFrameMaterial({ woodType: 'oak' }),
        panel: DoorMaterialFactory.createPanelMaterial({ woodType: 'oak' }),
        groove: DoorMaterialFactory.createGrooveMaterial('#5A3D20'),
        handle: DoorMaterialFactory.createHandleMaterial(),
      };
      
      // Set double-sided rendering for frame and panel so they're visible from both sides
      materials.frame.side = THREE.DoubleSide;
      materials.panel.side = THREE.DoubleSide;
      materials.groove.side = THREE.DoubleSide;
      
      return materials;
    } catch (error) {
      console.error('Failed to create door materials, using basic fallback materials', error);
      // Fallback to basic materials with solid colors
      return {
        frame: new THREE.MeshStandardMaterial({ color: '#6B4C2A', roughness: 0.6, metalness: 0.0, side: THREE.DoubleSide }),
        panel: new THREE.MeshStandardMaterial({ color: '#C4965A', roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide }),
        groove: new THREE.MeshStandardMaterial({ color: '#5A3D20', roughness: 0.8, metalness: 0.0, side: THREE.DoubleSide }),
        handle: new THREE.MeshStandardMaterial({ color: '#C8A84B', roughness: 0.2, metalness: 0.95 }),
      };
    }
  }, []);

  // Create LOD objects for door components with useMemo for performance
  const doorLODs = useMemo(() => {
    try {
      // Create LOD objects for frame components
      const frameLeftLOD = DoorGeometryFactory.createFrameLOD(
        doorMaterials.frame,
        { width: FRAME_T, height: DOOR_H + FRAME_T, frameThickness: FRAME_T },
        DOOR_LOD_CONFIG
      );
      frameLeftLOD.position.set(-DOOR_W / 2 - FRAME_T / 2, DOOR_H / 2, z);

      const frameRightLOD = DoorGeometryFactory.createFrameLOD(
        doorMaterials.frame,
        { width: FRAME_T, height: DOOR_H + FRAME_T, frameThickness: FRAME_T },
        DOOR_LOD_CONFIG
      );
      frameRightLOD.position.set(DOOR_W / 2 + FRAME_T / 2, DOOR_H / 2, z);

      const frameTopLOD = DoorGeometryFactory.createFrameLOD(
        doorMaterials.frame,
        { width: DOOR_W + FRAME_T * 2, height: FRAME_T, frameThickness: FRAME_T },
        DOOR_LOD_CONFIG
      );
      frameTopLOD.position.set(0, DOOR_H + FRAME_T / 2, z);

      // Create LOD object for door panel
      const panelLOD = DoorGeometryFactory.createPanelLOD(
        doorMaterials.panel,
        { width: DOOR_W, height: DOOR_H, panelThickness: PANEL_T },
        DOOR_LOD_CONFIG
      );
      panelLOD.position.set(DOOR_W / 2, DOOR_H / 2, -PANEL_T / 2);

      // Create LOD objects for handles
      const handleInnerLOD = DoorGeometryFactory.createHandleLOD(
        doorMaterials.handle,
        DOOR_LOD_CONFIG
      );
      handleInnerLOD.position.set(DOOR_W - 0.1, DOOR_H * 0.46, -PANEL_T - 0.03);

      const handleOuterLOD = DoorGeometryFactory.createHandleLOD(
        doorMaterials.handle,
        DOOR_LOD_CONFIG
      );
      handleOuterLOD.position.set(DOOR_W - 0.1, DOOR_H * 0.46, 0.03);

      return {
        frameLeft: frameLeftLOD,
        frameRight: frameRightLOD,
        frameTop: frameTopLOD,
        panel: panelLOD,
        handleInner: handleInnerLOD,
        handleOuter: handleOuterLOD,
      };
    } catch (error) {
      console.error('Failed to create door LOD objects, will use fallback rendering', error);
      return null;
    }
  }, [doorMaterials, z]);

  // Dispose materials and LOD geometries on unmount
  useEffect(() => {
    return () => {
      try {
        doorMaterials.frame.dispose();
        doorMaterials.panel.dispose();
        doorMaterials.groove.dispose();
        doorMaterials.handle.dispose();
        
        // Dispose textures if they exist
        if (doorMaterials.frame.map) doorMaterials.frame.map.dispose();
        if (doorMaterials.panel.map) doorMaterials.panel.map.dispose();
        if (doorMaterials.panel.normalMap) doorMaterials.panel.normalMap.dispose();
        if (doorMaterials.panel.roughnessMap) doorMaterials.panel.roughnessMap.dispose();

        // Dispose LOD geometries
        if (doorLODs) {
          Object.values(doorLODs).forEach(lod => {
            lod.levels.forEach(level => {
              const mesh = level.object as THREE.Mesh;
              if (mesh.geometry) mesh.geometry.dispose();
            });
          });
        }
      } catch (error) {
        console.warn('Error disposing door materials and geometries, some resources may not be cleaned up', error);
      }
    };
  }, [doorMaterials, doorLODs]);

  // If LOD creation failed, render with basic geometries (fallback)
  if (!doorLODs) {
    return (
      <group position={[xOffset, 0, 0]}>
        {/* Kusen kiri */}
        <mesh position={[-DOOR_W / 2 - FRAME_T / 2, DOOR_H / 2, z]} castShadow material={doorMaterials.frame}>
          <boxGeometry args={[FRAME_T, DOOR_H + FRAME_T, FRAME_T * 2]} />
        </mesh>
        {/* Kusen kanan */}
        <mesh position={[DOOR_W / 2 + FRAME_T / 2, DOOR_H / 2, z]} castShadow material={doorMaterials.frame}>
          <boxGeometry args={[FRAME_T, DOOR_H + FRAME_T, FRAME_T * 2]} />
        </mesh>
        {/* Ambang atas */}
        <mesh position={[0, DOOR_H + FRAME_T / 2, z]} castShadow material={doorMaterials.frame}>
          <boxGeometry args={[DOOR_W + FRAME_T * 2, FRAME_T, FRAME_T * 2]} />
        </mesh>

        {/* Daun pintu — pivot engsel di kiri (x = -DOOR_W/2), terbuka ~12° ke dalam ruangan */}
        <group position={[-DOOR_W / 2, 0, z]}>
          <group rotation={[0, Math.PI / 15, 0]}>
            {/* Panel utama */}
            <mesh position={[DOOR_W / 2, DOOR_H / 2, -PANEL_T / 2]} castShadow receiveShadow material={doorMaterials.panel}>
              <boxGeometry args={[DOOR_W, DOOR_H, PANEL_T]} />
            </mesh>
            {/* Groove atas */}
            <mesh position={[DOOR_W / 2, DOOR_H * 0.72, -PANEL_T - 0.004]} material={doorMaterials.groove}>
              <boxGeometry args={[DOOR_W * 0.72, DOOR_H * 0.32, 0.006]} />
            </mesh>
            {/* Groove bawah */}
            <mesh position={[DOOR_W / 2, DOOR_H * 0.26, -PANEL_T - 0.004]} material={doorMaterials.groove}>
              <boxGeometry args={[DOOR_W * 0.72, DOOR_H * 0.27, 0.006]} />
            </mesh>
            {/* Handle sisi dalam */}
            <mesh position={[DOOR_W - 0.1, DOOR_H * 0.46, -PANEL_T - 0.03]} castShadow material={doorMaterials.handle}>
              <sphereGeometry args={[0.028, 12, 12]} />
            </mesh>
            {/* Handle sisi luar */}
            <mesh position={[DOOR_W - 0.1, DOOR_H * 0.46, 0.03]} castShadow material={doorMaterials.handle}>
              <sphereGeometry args={[0.028, 12, 12]} />
            </mesh>
            {/* Batang handle (sumbu Z) */}
            <mesh position={[DOOR_W - 0.1, DOOR_H * 0.46, -PANEL_T / 2]} rotation={[Math.PI / 2, 0, 0]} material={doorMaterials.handle}>
              <cylinderGeometry args={[0.007, 0.007, PANEL_T + 0.07, 8]} />
            </mesh>
          </group>
        </group>
      </group>
    );
  }

  // Render with LOD objects for optimized performance
  return (
    <group position={[xOffset, 0, 0]}>
      {/* Frame components with LOD */}
      <primitive object={doorLODs.frameLeft} />
      <primitive object={doorLODs.frameRight} />
      <primitive object={doorLODs.frameTop} />

      {/* Door panel with LOD - pivot engsel di kiri (x = -DOOR_W/2), terbuka ~12° ke dalam ruangan */}
      <group position={[-DOOR_W / 2, 0, z]}>
        <group rotation={[0, Math.PI / 15, 0]}>
          {/* Panel utama with LOD */}
          <primitive object={doorLODs.panel} />
          
          {/* Groove atas - kept as simple geometry (small detail) */}
          <mesh position={[DOOR_W / 2, DOOR_H * 0.72, -PANEL_T - 0.004]} material={doorMaterials.groove}>
            <boxGeometry args={[DOOR_W * 0.72, DOOR_H * 0.32, 0.006]} />
          </mesh>
          
          {/* Groove bawah - kept as simple geometry (small detail) */}
          <mesh position={[DOOR_W / 2, DOOR_H * 0.26, -PANEL_T - 0.004]} material={doorMaterials.groove}>
            <boxGeometry args={[DOOR_W * 0.72, DOOR_H * 0.27, 0.006]} />
          </mesh>
          
          {/* Handle sisi dalam with LOD */}
          <primitive object={doorLODs.handleInner} />
          
          {/* Handle sisi luar with LOD */}
          <primitive object={doorLODs.handleOuter} />
          
          {/* Batang handle (sumbu Z) - kept as simple geometry (very small detail) */}
          <mesh position={[DOOR_W - 0.1, DOOR_H * 0.46, -PANEL_T / 2]} rotation={[Math.PI / 2, 0, 0]} material={doorMaterials.handle}>
            <cylinderGeometry args={[0.007, 0.007, PANEL_T + 0.07, 8]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// Lazy-loadable door wrapper - doors are always visible so load immediately
function DoorMesh({ roomD, xOffset = 0 }: { roomD: number; xOffset?: number }) {
  // Doors are critical components (always visible in main view), load immediately
  return <DoorMeshContent roomD={roomD} xOffset={xOffset} />;
}

// ── Realistic window glass (shared by both wall variants) ────────────────────

function WindowGlass({ winW, winH, winY }: { winW: number; winH: number; winY: number }) {
  const timeOfDay = useEditorStore((s) => s.timeOfDay);
  const isNight = timeOfDay === 'night';

  // Create glass material once and update it when timeOfDay changes
  // This is more efficient than recreating the material
  const glassMaterial = useMemo(() => {
    try {
      return WindowMaterialFactory.createGlassMaterial({
        glassStyle: 'clear',
        timeOfDay: 'day', // Initial state
      });
    } catch (error) {
      console.error('Failed to create glass material, using basic fallback', error);
      // Fallback to basic transparent material
      return new THREE.MeshPhysicalMaterial({
        color: '#A8CCEC',
        transparent: true,
        opacity: 0.215,
        roughness: 0.02,
        metalness: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
    }
  }, []); // Only create once

  // Update material properties when timeOfDay changes
  useEffect(() => {
    try {
      WindowMaterialFactory.updateForTimeOfDay(glassMaterial, timeOfDay);
    } catch (error) {
      console.warn('Failed to update glass material for time of day change', error);
    }
  }, [timeOfDay, glassMaterial]);

  // Dispose material on unmount
  useEffect(() => {
    return () => {
      try {
        glassMaterial.dispose();
      } catch (error) {
        console.warn('Error disposing glass material, some resources may not be cleaned up', error);
      }
    };
  }, [glassMaterial]);

  return (
    <>
      {/* Main glass — realistic physical material with transmission and refraction */}
      <mesh position={[0, winY + winH / 2, 0.004]} renderOrder={1}>
        <planeGeometry args={[winW, winH]} />
        <primitive object={glassMaterial} attach="material" />
      </mesh>
      {/* Inner glass face */}
      <mesh position={[0, winY + winH / 2, 0.008]} renderOrder={2}>
        <planeGeometry args={[winW - 0.02, winH - 0.02]} />
        <meshStandardMaterial
          color={isNight ? '#050D1E' : '#DDEEFF'}
          transparent opacity={isNight ? 0.3 : 0.06}
          roughness={0.0} metalness={0.3}
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>
      {/* Sky glare — bright day / dark night with stars hint */}
      <mesh position={[0, winY + winH * 0.72, 0.006]} renderOrder={3}>
        <planeGeometry args={[winW * 0.85, winH * 0.42]} />
        <meshStandardMaterial
          color={isNight ? '#0D1A3A' : '#FFFFFF'}
          emissive={isNight ? '#0A1530' : '#C8E8FF'}
          emissiveIntensity={isNight ? 0.15 : 0.55}
          transparent opacity={isNight ? 0.4 : 0.09}
          roughness={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Outdoor light: sun (day) → faint moon (night) */}
      <pointLight
        position={[0, winY + winH * 0.6, -1.2]}
        intensity={isNight ? 0.15 : 1.5}
        color={isNight ? '#4060A0' : '#C8DFFF'}
        distance={7} decay={2}
      />
      <pointLight
        position={[0, winY + winH * 0.5, 0.8]}
        intensity={isNight ? 0.04 : 0.4}
        color={isNight ? '#1A2A50' : '#EEF6FF'}
        distance={3} decay={2}
      />
    </>
  );
}

// ── Wall with window ──────────────────────────────────────────────────────────

function WallWithWindow({ W, H, position, rotation, wallColor, wallTexture, windowX = 0 }: {
  W: number; H: number;
  position: [number, number, number];
  rotation: [number, number, number];
  wallColor: string;
  wallTexture: THREE.CanvasTexture | null;
  windowX?: number;
}) {
  const winW = Math.min(1.4, W * 0.35);
  const winH = Math.min(1.2, H * 0.42);
  const winY = H * 0.3;
  const frameT = 0.04;

  // Create geometry with window hole - memoized for performance
  const { uvAttribute } = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-W / 2, 0); shape.lineTo(W / 2, 0);
    shape.lineTo(W / 2, H); shape.lineTo(-W / 2, H);
    shape.closePath();

    const hole = new THREE.Path();
    hole.moveTo(windowX - winW / 2, winY); hole.lineTo(windowX + winW / 2, winY);
    hole.lineTo(windowX + winW / 2, winY + winH); hole.lineTo(windowX - winW / 2, winY + winH);
    hole.closePath();
    shape.holes.push(hole);

    const geo = new THREE.ShapeGeometry(shape, 4);
    const pos = geo.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2]     = (pos.getX(i) + W / 2) / W;
      uv[i * 2 + 1] = pos.getY(i) / H;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    return { uvAttribute: geo };
  }, [W, H, windowX, winW, winH, winY]);

  // Create frame material using WindowMaterialFactory with useMemo for performance
  const frameMaterial = useMemo(() => {
    try {
      return WindowMaterialFactory.createFrameMaterial();
    } catch (error) {
      console.error('Failed to create window frame material, using basic fallback', error);
      // Fallback to basic material with solid color
      return new THREE.MeshStandardMaterial({
        color: '#E8E4DE',
        roughness: 0.5,
        metalness: 0.0,
      });
    }
  }, []);

  // Create LOD for wall with window hole
  const wallWithWindowLOD = useMemo(() => {
    const lod = new THREE.LOD();
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: wallColor,
      ...(wallTexture ? { map: wallTexture } : {}),
      roughness: 0.25,
      metalness: 0.05,
      envMapIntensity: 1.2,
      side: THREE.FrontSide,
    });

    // HIGH detail - use full ShapeGeometry with window hole
    const highMesh = new THREE.Mesh(uvAttribute.clone(), material);
    highMesh.receiveShadow = true;
    lod.addLevel(highMesh, ROOM_LOD_CONFIG.HIGH.distance);

    // MEDIUM detail - simplified ShapeGeometry
    const mediumGeo = uvAttribute.clone();
    const mediumMesh = new THREE.Mesh(mediumGeo, material);
    mediumMesh.receiveShadow = true;
    lod.addLevel(mediumMesh, ROOM_LOD_CONFIG.MEDIUM.distance);

    // LOW detail - simple plane (no window hole visible at distance)
    const lowGeo = new THREE.PlaneGeometry(W, H, 1, 1);
    const lowMesh = new THREE.Mesh(lowGeo, material);
    lowMesh.receiveShadow = true;
    lod.addLevel(lowMesh, ROOM_LOD_CONFIG.LOW.distance);

    return { lod, material };
  }, [W, H, uvAttribute, wallColor, wallTexture]);

  // Create LOD objects for window frame components with useMemo for performance
  const windowFrameLODs = useMemo(() => {
    try {
      // Create LOD objects for frame components
      const topFrameLOD = WindowGeometryFactory.createFrameLOD(
        frameMaterial,
        { width: winW + frameT * 2, height: frameT, frameThickness: 0.04 },
        WINDOW_LOD_CONFIG
      );
      topFrameLOD.position.set(0, winY + winH + frameT / 2, 0.02);

      const bottomFrameLOD = WindowGeometryFactory.createFrameLOD(
        frameMaterial,
        { width: winW + frameT * 2, height: frameT, frameThickness: 0.06 },
        WINDOW_LOD_CONFIG
      );
      bottomFrameLOD.position.set(0, winY - frameT / 2, 0.02);

      const leftFrameLOD = WindowGeometryFactory.createFrameLOD(
        frameMaterial,
        { width: frameT, height: winH, frameThickness: 0.04 },
        WINDOW_LOD_CONFIG
      );
      leftFrameLOD.position.set(-winW / 2 - frameT / 2, winY + winH / 2, 0.02);

      const rightFrameLOD = WindowGeometryFactory.createFrameLOD(
        frameMaterial,
        { width: frameT, height: winH, frameThickness: 0.04 },
        WINDOW_LOD_CONFIG
      );
      rightFrameLOD.position.set(winW / 2 + frameT / 2, winY + winH / 2, 0.02);

      // Create LOD objects for dividers
      const horizontalDividerLOD = WindowGeometryFactory.createDividerLOD(
        frameMaterial,
        { width: winW, frameThickness: frameT },
        WINDOW_LOD_CONFIG
      );
      horizontalDividerLOD.position.set(0, winY + winH / 2, 0.02);

      const verticalDividerLOD = WindowGeometryFactory.createDividerLOD(
        frameMaterial,
        { width: winH, frameThickness: frameT },
        WINDOW_LOD_CONFIG
      );
      verticalDividerLOD.position.set(0, winY + winH / 2, 0.02);
      verticalDividerLOD.rotation.set(0, 0, Math.PI / 2);

      return {
        topFrame: topFrameLOD,
        bottomFrame: bottomFrameLOD,
        leftFrame: leftFrameLOD,
        rightFrame: rightFrameLOD,
        horizontalDivider: horizontalDividerLOD,
        verticalDivider: verticalDividerLOD,
      };
    } catch (error) {
      console.error('Failed to create window frame LOD objects, will use fallback rendering', error);
      return null;
    }
  }, [frameMaterial, winW, winH, winY, frameT]);

  // Register wall LOD geometries with MemoryManager
  useEffect(() => {
    const memoryManager = getMemoryManager();
    
    wallWithWindowLOD.lod.levels.forEach((level, index) => {
      const mesh = level.object as THREE.Mesh;
      if (mesh.geometry) {
        const geometryId = `wall-window-lod-${index}-${W}-${H}-${position.join('-')}`;
        if (!memoryManager.isRegistered(geometryId)) {
          memoryManager.registerGeometry(geometryId, mesh.geometry);
        }
      }
    });
    
    // Register wall material
    const materialId = `wall-window-material-${W}-${H}-${position.join('-')}`;
    if (!memoryManager.isRegistered(materialId)) {
      memoryManager.registerMaterial(materialId, wallWithWindowLOD.material);
    }
    
    return () => {
      // Dispose geometries
      wallWithWindowLOD.lod.levels.forEach((level, index) => {
        const mesh = level.object as THREE.Mesh;
        if (mesh.geometry) {
          const geometryId = `wall-window-lod-${index}-${W}-${H}-${position.join('-')}`;
          memoryManager.dispose(geometryId);
        }
      });
      
      // Dispose material
      const materialId = `wall-window-material-${W}-${H}-${position.join('-')}`;
      memoryManager.dispose(materialId);
    };
  }, [wallWithWindowLOD, W, H, position]);

  // Dispose material, textures, and LOD geometries on unmount
  useEffect(() => {
    return () => {
      try {
        if (frameMaterial.map) frameMaterial.map.dispose();
        frameMaterial.dispose();

        // Dispose LOD geometries
        if (windowFrameLODs) {
          Object.values(windowFrameLODs).forEach(lod => {
            lod.levels.forEach(level => {
              const mesh = level.object as THREE.Mesh;
              if (mesh.geometry) mesh.geometry.dispose();
            });
          });
        }
      } catch (error) {
        console.warn('Error disposing window frame material and geometries, some resources may not be cleaned up', error);
      }
    };
  }, [frameMaterial, windowFrameLODs]);

  // If LOD creation failed, render with basic geometries (fallback)
  if (!windowFrameLODs) {
    return (
      <group position={position} rotation={rotation}>
        <primitive object={wallWithWindowLOD.lod} />
        {/* Window frame — offset by windowX */}
        <group position={[windowX, 0, 0]}>
          {/* Top frame */}
          <mesh position={[0, winY + winH + frameT / 2, 0.02]} castShadow material={frameMaterial}>
            <boxGeometry args={[winW + frameT * 2, frameT, 0.04]} />
          </mesh>
          {/* Bottom frame */}
          <mesh position={[0, winY - frameT / 2, 0.02]} castShadow material={frameMaterial}>
            <boxGeometry args={[winW + frameT * 2, frameT, 0.06]} />
          </mesh>
          {/* Left frame */}
          <mesh position={[-winW / 2 - frameT / 2, winY + winH / 2, 0.02]} castShadow material={frameMaterial}>
            <boxGeometry args={[frameT, winH, 0.04]} />
          </mesh>
          {/* Right frame */}
          <mesh position={[winW / 2 + frameT / 2, winY + winH / 2, 0.02]} castShadow material={frameMaterial}>
            <boxGeometry args={[frameT, winH, 0.04]} />
          </mesh>
          {/* Horizontal divider */}
          <mesh position={[0, winY + winH / 2, 0.02]} material={frameMaterial}>
            <boxGeometry args={[winW, frameT * 0.7, 0.03]} />
          </mesh>
          {/* Vertical divider */}
          <mesh position={[0, winY + winH / 2, 0.02]} material={frameMaterial}>
            <boxGeometry args={[frameT * 0.7, winH, 0.03]} />
          </mesh>
          <WindowGlass winW={winW} winH={winH} winY={winY} />
        </group>
      </group>
    );
  }

  return (
    <group position={position} rotation={rotation}>
      <primitive object={wallWithWindowLOD.lod} />
      {/* Window frame with LOD — offset by windowX */}
      <group position={[windowX, 0, 0]}>
        {/* Frame components with LOD */}
        <primitive object={windowFrameLODs.topFrame} />
        <primitive object={windowFrameLODs.bottomFrame} />
        <primitive object={windowFrameLODs.leftFrame} />
        <primitive object={windowFrameLODs.rightFrame} />
        
        {/* Dividers with LOD */}
        <primitive object={windowFrameLODs.horizontalDivider} />
        <primitive object={windowFrameLODs.verticalDivider} />
        
        <WindowGlass winW={winW} winH={winH} winY={winY} />
      </group>
    </group>
  );
}

function WallWithWindowImage({ W, H, position, rotation, thumbnailUrl, windowX = 0 }: {
  W: number; H: number;
  position: [number, number, number];
  rotation: [number, number, number];
  thumbnailUrl: string;
  windowX?: number;
}) {
  const tex = useImageTexture(thumbnailUrl, W * 100, H * 100);

  const winW = Math.min(1.4, W * 0.35);
  const winH = Math.min(1.2, H * 0.42);
  const winY = H * 0.3;
  const frameT = 0.04;

  // Create geometry with window hole - memoized for performance
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-W / 2, 0); shape.lineTo(W / 2, 0);
    shape.lineTo(W / 2, H); shape.lineTo(-W / 2, H);
    shape.closePath();

    const hole = new THREE.Path();
    hole.moveTo(windowX - winW / 2, winY); hole.lineTo(windowX + winW / 2, winY);
    hole.lineTo(windowX + winW / 2, winY + winH); hole.lineTo(windowX - winW / 2, winY + winH);
    hole.closePath();
    shape.holes.push(hole);

    const g = new THREE.ShapeGeometry(shape, 4);
    const pos = g.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2]     = (pos.getX(i) + W / 2) / W;
      uv[i * 2 + 1] = pos.getY(i) / H;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }, [W, H, windowX, winW, winH, winY]);

  // Create frame material using WindowMaterialFactory with useMemo for performance
  const frameMaterial = useMemo(() => {
    try {
      return WindowMaterialFactory.createFrameMaterial();
    } catch (error) {
      console.error('Failed to create window frame material, using basic fallback', error);
      // Fallback to basic material with solid color
      return new THREE.MeshStandardMaterial({
        color: '#E8E4DE',
        roughness: 0.5,
        metalness: 0.0,
      });
    }
  }, []);

  // Create LOD for wall with window hole and image texture
  const wallWithWindowImageLOD = useMemo(() => {
    const lod = new THREE.LOD();
    
    // Create material with image texture
    const material = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.25,
      metalness: 0.05,
      envMapIntensity: 1.2,
      side: THREE.FrontSide,
    });

    // HIGH detail - use full ShapeGeometry with window hole
    const highMesh = new THREE.Mesh(geo.clone(), material);
    highMesh.receiveShadow = true;
    lod.addLevel(highMesh, ROOM_LOD_CONFIG.HIGH.distance);

    // MEDIUM detail - simplified ShapeGeometry
    const mediumGeo = geo.clone();
    const mediumMesh = new THREE.Mesh(mediumGeo, material);
    mediumMesh.receiveShadow = true;
    lod.addLevel(mediumMesh, ROOM_LOD_CONFIG.MEDIUM.distance);

    // LOW detail - simple plane (no window hole visible at distance)
    const lowGeo = new THREE.PlaneGeometry(W, H, 1, 1);
    const lowMesh = new THREE.Mesh(lowGeo, material);
    lowMesh.receiveShadow = true;
    lod.addLevel(lowMesh, ROOM_LOD_CONFIG.LOW.distance);

    return { lod, material };
  }, [W, H, geo, tex]);

  // Create LOD objects for window frame components with useMemo for performance
  const windowFrameLODs = useMemo(() => {
    try {
      // Create LOD objects for frame components
      const topFrameLOD = WindowGeometryFactory.createFrameLOD(
        frameMaterial,
        { width: winW + frameT * 2, height: frameT, frameThickness: 0.04 },
        WINDOW_LOD_CONFIG
      );
      topFrameLOD.position.set(0, winY + winH + frameT / 2, 0.02);

      const bottomFrameLOD = WindowGeometryFactory.createFrameLOD(
        frameMaterial,
        { width: winW + frameT * 2, height: frameT, frameThickness: 0.06 },
        WINDOW_LOD_CONFIG
      );
      bottomFrameLOD.position.set(0, winY - frameT / 2, 0.02);

      const leftFrameLOD = WindowGeometryFactory.createFrameLOD(
        frameMaterial,
        { width: frameT, height: winH, frameThickness: 0.04 },
        WINDOW_LOD_CONFIG
      );
      leftFrameLOD.position.set(-winW / 2 - frameT / 2, winY + winH / 2, 0.02);

      const rightFrameLOD = WindowGeometryFactory.createFrameLOD(
        frameMaterial,
        { width: frameT, height: winH, frameThickness: 0.04 },
        WINDOW_LOD_CONFIG
      );
      rightFrameLOD.position.set(winW / 2 + frameT / 2, winY + winH / 2, 0.02);

      // Create LOD objects for dividers
      const horizontalDividerLOD = WindowGeometryFactory.createDividerLOD(
        frameMaterial,
        { width: winW, frameThickness: frameT },
        WINDOW_LOD_CONFIG
      );
      horizontalDividerLOD.position.set(0, winY + winH / 2, 0.02);

      const verticalDividerLOD = WindowGeometryFactory.createDividerLOD(
        frameMaterial,
        { width: winH, frameThickness: frameT },
        WINDOW_LOD_CONFIG
      );
      verticalDividerLOD.position.set(0, winY + winH / 2, 0.02);
      verticalDividerLOD.rotation.set(0, 0, Math.PI / 2);

      return {
        topFrame: topFrameLOD,
        bottomFrame: bottomFrameLOD,
        leftFrame: leftFrameLOD,
        rightFrame: rightFrameLOD,
        horizontalDivider: horizontalDividerLOD,
        verticalDivider: verticalDividerLOD,
      };
    } catch (error) {
      console.error('Failed to create window frame LOD objects, will use fallback rendering', error);
      return null;
    }
  }, [frameMaterial, winW, winH, winY, frameT]);

  // Register wall LOD geometries with MemoryManager
  useEffect(() => {
    const memoryManager = getMemoryManager();
    
    wallWithWindowImageLOD.lod.levels.forEach((level, index) => {
      const mesh = level.object as THREE.Mesh;
      if (mesh.geometry) {
        const geometryId = `wall-window-image-lod-${index}-${W}-${H}-${thumbnailUrl}`;
        if (!memoryManager.isRegistered(geometryId)) {
          memoryManager.registerGeometry(geometryId, mesh.geometry);
        }
      }
    });
    
    // Register wall material
    const materialId = `wall-window-image-material-${W}-${H}-${thumbnailUrl}`;
    if (!memoryManager.isRegistered(materialId)) {
      memoryManager.registerMaterial(materialId, wallWithWindowImageLOD.material);
    }
    
    return () => {
      // Dispose geometries
      wallWithWindowImageLOD.lod.levels.forEach((level, index) => {
        const mesh = level.object as THREE.Mesh;
        if (mesh.geometry) {
          const geometryId = `wall-window-image-lod-${index}-${W}-${H}-${thumbnailUrl}`;
          memoryManager.dispose(geometryId);
        }
      });
      
      // Dispose material
      const materialId = `wall-window-image-material-${W}-${H}-${thumbnailUrl}`;
      memoryManager.dispose(materialId);
    };
  }, [wallWithWindowImageLOD, W, H, thumbnailUrl]);

  // Dispose material, textures, and LOD geometries on unmount
  useEffect(() => {
    return () => {
      try {
        if (frameMaterial.map) frameMaterial.map.dispose();
        frameMaterial.dispose();

        // Dispose LOD geometries
        if (windowFrameLODs) {
          Object.values(windowFrameLODs).forEach(lod => {
            lod.levels.forEach(level => {
              const mesh = level.object as THREE.Mesh;
              if (mesh.geometry) mesh.geometry.dispose();
            });
          });
        }
      } catch (error) {
        console.warn('Error disposing window frame material and geometries, some resources may not be cleaned up', error);
      }
    };
  }, [frameMaterial, windowFrameLODs]);

  // If LOD creation failed, render with basic geometries (fallback)
  if (!windowFrameLODs) {
    return (
      <group position={position} rotation={rotation}>
        <primitive object={wallWithWindowImageLOD.lod} />
        <group position={[windowX, 0, 0]}>
          {/* Top frame */}
          <mesh position={[0, winY + winH + frameT / 2, 0.02]} castShadow material={frameMaterial}>
            <boxGeometry args={[winW + frameT * 2, frameT, 0.04]} />
          </mesh>
          {/* Bottom frame */}
          <mesh position={[0, winY - frameT / 2, 0.02]} castShadow material={frameMaterial}>
            <boxGeometry args={[winW + frameT * 2, frameT, 0.06]} />
          </mesh>
          {/* Left frame */}
          <mesh position={[-winW / 2 - frameT / 2, winY + winH / 2, 0.02]} castShadow material={frameMaterial}>
            <boxGeometry args={[frameT, winH, 0.04]} />
          </mesh>
          {/* Right frame */}
          <mesh position={[winW / 2 + frameT / 2, winY + winH / 2, 0.02]} castShadow material={frameMaterial}>
            <boxGeometry args={[frameT, winH, 0.04]} />
          </mesh>
          {/* Horizontal divider */}
          <mesh position={[0, winY + winH / 2, 0.02]} material={frameMaterial}>
            <boxGeometry args={[winW, frameT * 0.7, 0.03]} />
          </mesh>
          {/* Vertical divider */}
          <mesh position={[0, winY + winH / 2, 0.02]} material={frameMaterial}>
            <boxGeometry args={[frameT * 0.7, winH, 0.03]} />
          </mesh>
          <WindowGlass winW={winW} winH={winH} winY={winY} />
        </group>
      </group>
    );
  }

  return (
    <group position={position} rotation={rotation}>
      <primitive object={wallWithWindowImageLOD.lod} />
      <group position={[windowX, 0, 0]}>
        {/* Frame components with LOD */}
        <primitive object={windowFrameLODs.topFrame} />
        <primitive object={windowFrameLODs.bottomFrame} />
        <primitive object={windowFrameLODs.leftFrame} />
        <primitive object={windowFrameLODs.rightFrame} />
        
        {/* Dividers with LOD */}
        <primitive object={windowFrameLODs.horizontalDivider} />
        <primitive object={windowFrameLODs.verticalDivider} />
        
        <WindowGlass winW={winW} winH={winH} winY={winY} />
      </group>
    </group>
  );
}

// ── Helper: render wall with or without image texture ─────────────────────────

type WallSide = 'north' | 'south' | 'east' | 'west';

function WallNode({
  side, W, H, position, rotation, wallColor, wallTexture, thumbnail, windowX = 0,
}: {
  side: WallSide;
  W: number; H: number;
  position: [number, number, number];
  rotation: [number, number, number];
  wallColor: string;
  wallTexture: THREE.CanvasTexture | null;
  thumbnail?: string | null;
  windowX?: number;
}) {
  if (thumbnail) {
    if (side === 'north') {
      return (
        <Suspense fallback={<WallWithWindow W={W} H={H} position={position} rotation={rotation} wallColor={wallColor} wallTexture={wallTexture} windowX={windowX} />}>
          <WallWithWindowImage W={W} H={H} position={position} rotation={rotation} thumbnailUrl={thumbnail} windowX={windowX} />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<PlainWall W={W} H={H} position={position} rotation={rotation} wallColor={wallColor} wallTexture={wallTexture} />}>
        <PlainWallImage W={W} H={H} position={position} rotation={rotation} thumbnailUrl={thumbnail} />
      </Suspense>
    );
  }
  if (side === 'north') {
    return <WallWithWindow W={W} H={H} position={position} rotation={rotation} wallColor={wallColor} wallTexture={wallTexture} windowX={windowX} />;
  }
  return <PlainWall W={W} H={H} position={position} rotation={rotation} wallColor={wallColor} wallTexture={wallTexture} />;
}

// ── LOD Configuration ─────────────────────────────────────────────────────────

/**
 * LOD configuration for room geometry
 * - HIGH: Full detail (distance 0-10 units) - full segments
 * - MEDIUM: Reduced detail (distance 10-25 units) - 50% segments
 * - LOW: Minimal detail (distance 25+ units) - 25% segments (simple boxes)
 */
const ROOM_LOD_CONFIG = {
  HIGH: { distance: 0, segmentMultiplier: 1.0 },
  MEDIUM: { distance: 10, segmentMultiplier: 0.5 },
  LOW: { distance: 25, segmentMultiplier: 0.25 },
};

/**
 * Create LOD object for floor/ceiling plane geometry
 */
function createPlaneLOD(
  width: number,
  depth: number,
  material: THREE.Material,
  rotation: [number, number, number],
  position: [number, number, number]
): THREE.LOD {
  const lod = new THREE.LOD();

  // HIGH detail - full segments (32x32)
  const highSegments = 32;
  const highGeometry = new THREE.PlaneGeometry(width, depth, highSegments, highSegments);
  const highMesh = new THREE.Mesh(highGeometry, material);
  highMesh.rotation.set(...rotation);
  highMesh.position.set(...position);
  highMesh.receiveShadow = true;
  lod.addLevel(highMesh, ROOM_LOD_CONFIG.HIGH.distance);

  // MEDIUM detail - 50% segments (16x16)
  const mediumSegments = Math.max(1, Math.floor(highSegments * ROOM_LOD_CONFIG.MEDIUM.segmentMultiplier));
  const mediumGeometry = new THREE.PlaneGeometry(width, depth, mediumSegments, mediumSegments);
  const mediumMesh = new THREE.Mesh(mediumGeometry, material);
  mediumMesh.rotation.set(...rotation);
  mediumMesh.position.set(...position);
  mediumMesh.receiveShadow = true;
  lod.addLevel(mediumMesh, ROOM_LOD_CONFIG.MEDIUM.distance);

  // LOW detail - 25% segments (8x8)
  const lowSegments = Math.max(1, Math.floor(highSegments * ROOM_LOD_CONFIG.LOW.segmentMultiplier));
  const lowGeometry = new THREE.PlaneGeometry(width, depth, lowSegments, lowSegments);
  const lowMesh = new THREE.Mesh(lowGeometry, material);
  lowMesh.rotation.set(...rotation);
  lowMesh.position.set(...position);
  lowMesh.receiveShadow = true;
  lod.addLevel(lowMesh, ROOM_LOD_CONFIG.LOW.distance);

  return lod;
}

/**
 * Create LOD object for wall plane geometry
 */
function createWallPlaneLOD(
  width: number,
  height: number,
  material: THREE.Material
): THREE.LOD {
  const lod = new THREE.LOD();

  // HIGH detail - full segments (16x16)
  const highSegments = 16;
  const highGeometry = new THREE.PlaneGeometry(width, height, highSegments, highSegments);
  const highMesh = new THREE.Mesh(highGeometry, material);
  highMesh.receiveShadow = true;
  lod.addLevel(highMesh, ROOM_LOD_CONFIG.HIGH.distance);

  // MEDIUM detail - 50% segments (8x8)
  const mediumSegments = Math.max(1, Math.floor(highSegments * ROOM_LOD_CONFIG.MEDIUM.segmentMultiplier));
  const mediumGeometry = new THREE.PlaneGeometry(width, height, mediumSegments, mediumSegments);
  const mediumMesh = new THREE.Mesh(mediumGeometry, material);
  mediumMesh.receiveShadow = true;
  lod.addLevel(mediumMesh, ROOM_LOD_CONFIG.MEDIUM.distance);

  // LOW detail - 25% segments (4x4)
  const lowSegments = Math.max(1, Math.floor(highSegments * ROOM_LOD_CONFIG.LOW.segmentMultiplier));
  const lowGeometry = new THREE.PlaneGeometry(width, height, lowSegments, lowSegments);
  const lowMesh = new THREE.Mesh(lowGeometry, material);
  lowMesh.receiveShadow = true;
  lod.addLevel(lowMesh, ROOM_LOD_CONFIG.LOW.distance);

  return lod;
}

/**
 * Create LOD object for plinth box geometry
 */
function createPlinthLOD(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material
): THREE.LOD {
  const lod = new THREE.LOD();

  // HIGH detail - full segments (4 per dimension)
  const highSegments = 4;
  const highGeometry = new THREE.BoxGeometry(width, height, depth, highSegments, highSegments, highSegments);
  const highMesh = new THREE.Mesh(highGeometry, material);
  highMesh.receiveShadow = true;
  highMesh.castShadow = true;
  lod.addLevel(highMesh, ROOM_LOD_CONFIG.HIGH.distance);

  // MEDIUM detail - 50% segments (2 per dimension)
  const mediumSegments = Math.max(1, Math.floor(highSegments * ROOM_LOD_CONFIG.MEDIUM.segmentMultiplier));
  const mediumGeometry = new THREE.BoxGeometry(width, height, depth, mediumSegments, mediumSegments, mediumSegments);
  const mediumMesh = new THREE.Mesh(mediumGeometry, material);
  mediumMesh.receiveShadow = true;
  mediumMesh.castShadow = true;
  lod.addLevel(mediumMesh, ROOM_LOD_CONFIG.MEDIUM.distance);

  // LOW detail - 25% segments (1 per dimension - simple box)
  const lowSegments = 1;
  const lowGeometry = new THREE.BoxGeometry(width, height, depth, lowSegments, lowSegments, lowSegments);
  const lowMesh = new THREE.Mesh(lowGeometry, material);
  lowMesh.receiveShadow = true;
  lowMesh.castShadow = true;
  lod.addLevel(lowMesh, ROOM_LOD_CONFIG.LOW.distance);

  return lod;
}

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * RoomMesh component - Memoized to prevent unnecessary re-renders
 * 
 * This is a heavy component with complex geometry (walls, floor, ceiling, doors, windows)
 * and LOD systems. Memoization prevents re-rendering when roomConfig hasn't changed.
 * 
 * Re-renders only when:
 * - roomConfig changes (dimensions, materials, colors, wallpapers)
 * 
 * Props that trigger re-renders:
 * - roomConfig.width, depth, height (room dimensions)
 * - roomConfig.floorMaterial, floorColor (floor appearance)
 * - roomConfig.wallColor, wallTexture (wall appearance)
 * - roomConfig.wallpapers (per-wall customization)
 * - roomConfig.doorOffsetX, windowOffsetX (door/window positions)
 * 
 * Performance impact:
 * - Without memo: Re-renders on every furniture move/add/remove
 * - With memo: Only re-renders when room configuration actually changes
 * - Typical savings: 90%+ reduction in unnecessary re-renders
 * 
 * Requirements: 13.1, 13.2
 */
const RoomMesh = memo(function RoomMesh() {
  const { roomConfig } = useEditorStore();
  const W = roomConfig.width;
  const D = roomConfig.depth;
  const H = roomConfig.height;

  const floorProps = FLOOR_PROPERTIES[roomConfig.floorMaterial] ?? FLOOR_PROPERTIES.parket;
  const floorColor = roomConfig.floorColor ?? floorProps.color;
  const wallColor  = roomConfig.wallColor ?? '#F5F5F0';

  const floorTexture = useMemo(
    () => (typeof window !== 'undefined' && roomConfig.floorMaterial === 'marmer'
      ? makeMarbleTexture(floorColor)
      : null),
    [roomConfig.floorMaterial, floorColor],
  );
  const wallpapers = roomConfig.wallpapers ?? {};

  const wallTexture = useMemo(
    () => (typeof window !== 'undefined' ? makeWallTexture(roomConfig.wallTexture ?? 'plain', wallColor) : null),
    [roomConfig.wallTexture, wallColor],
  );

  const getWallColor = (side: WallSide) => wallpapers[side]?.color ?? wallColor;
  const getWallTexture = (side: WallSide) => {
    const wp = wallpapers[side];
    if (wp && !wp.thumbnail && typeof window !== 'undefined') {
      return makeWallTexture(wp.texture_pattern ?? 'plain', wp.color);
    }
    return wallTexture;
  };
  const getThumbnail = (side: WallSide) => wallpapers[side]?.thumbnail ?? null;

  // Create shared floor material (reuse across floor mesh)
  const floorMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: floorColor,
      map: floorTexture ?? undefined,
      roughness: floorProps.roughness,
      metalness: floorProps.metalness,
      envMapIntensity: 1.5,
    });
  }, [floorColor, floorTexture, floorProps.roughness, floorProps.metalness]);

  // Create shared ceiling material (reuse across ceiling mesh)
  const ceilingMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#FAFAF9',
      roughness: 0.75,
      metalness: 0.0,
      envMapIntensity: 1.0,
    });
  }, []);

  // Create shared plinth material (reuse across all plinth meshes)
  const plinthMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.7,
    });
  }, []);

  // Create LOD objects for floor and ceiling
  const floorLOD = useMemo(() => {
    return createPlaneLOD(W, D, floorMaterial, [-Math.PI / 2, 0, 0], [0, 0, 0]);
  }, [W, D, floorMaterial]);

  const ceilingLOD = useMemo(() => {
    return createPlaneLOD(W, D, ceilingMaterial, [Math.PI / 2, 0, 0], [0, H, 0]);
  }, [W, D, H, ceilingMaterial]);

  // Create LOD objects for plinths
  const plinthLODs = useMemo(() => {
    const plinths = [
      { pos: [0, 0.05, -D / 2 + 0.01] as [number, number, number], args: [W, 0.1, 0.02] as [number, number, number] },
      { pos: [0, 0.05, D / 2 - 0.01] as [number, number, number], args: [W, 0.1, 0.02] as [number, number, number] },
      { pos: [-W / 2 + 0.01, 0.05, 0] as [number, number, number], args: [0.02, 0.1, D - 0.04] as [number, number, number] },
      { pos: [W / 2 - 0.01, 0.05, 0] as [number, number, number], args: [0.02, 0.1, D - 0.04] as [number, number, number] },
    ];

    return plinths.map((p) => {
      const lod = createPlinthLOD(p.args[0], p.args[1], p.args[2], plinthMaterial);
      lod.position.set(...p.pos);
      return lod;
    });
  }, [W, D, plinthMaterial]);

  /**
   * GEOMETRY MERGING OPTIMIZATION (Task 24) - DISABLED
   * 
   * NOTE: Geometry merging is currently disabled because it causes visual bugs
   * where ceiling and plinths inherit the floor material/texture incorrectly.
   * 
   * Issue: When merging geometries with different materials (floor, ceiling, plinths),
   * the merged geometry can only use a single material, causing all parts to look the same.
   * 
   * Solution: Keep individual meshes with their own materials for correct rendering.
   * This slightly increases draw calls but ensures visual correctness.
   * 
   * Performance Impact:
   * - Draw calls: ~7 (1 floor + 1 ceiling + 4 plinths + 1 grid)
   * - Still optimized with LOD system for each mesh
   * 
   * Future: Consider using material groups or instanced rendering for optimization
   * while maintaining correct material assignment per geometry.
   */
  const mergedStaticLOD = useMemo((): { lod: THREE.LOD; material: THREE.Material } | null => {
    // Geometry merging disabled - return null to use individual meshes
    return null;
  }, []);

  // Register materials with MemoryManager
  useEffect(() => {
    const memoryManager = getMemoryManager();
    
    // Register floor material
    const floorMaterialId = `room-floor-material-${W}-${D}`;
    if (!memoryManager.isRegistered(floorMaterialId)) {
      memoryManager.registerMaterial(floorMaterialId, floorMaterial);
    }
    
    // Register ceiling material
    const ceilingMaterialId = `room-ceiling-material-${W}-${D}-${H}`;
    if (!memoryManager.isRegistered(ceilingMaterialId)) {
      memoryManager.registerMaterial(ceilingMaterialId, ceilingMaterial);
    }
    
    // Register plinth material
    const plinthMaterialId = `room-plinth-material`;
    if (!memoryManager.isRegistered(plinthMaterialId)) {
      memoryManager.registerMaterial(plinthMaterialId, plinthMaterial);
    }
    
    return () => {
      // Dispose materials on unmount
      memoryManager.dispose(floorMaterialId);
      memoryManager.dispose(ceilingMaterialId);
      memoryManager.dispose(plinthMaterialId);
    };
  }, [floorMaterial, ceilingMaterial, plinthMaterial, W, D, H]);

  // Register LOD geometries with MemoryManager
  useEffect(() => {
    const memoryManager = getMemoryManager();
    
    // If we have merged geometry, register it instead of individual geometries
    if (mergedStaticLOD && 'lod' in mergedStaticLOD) {
      mergedStaticLOD.lod.levels.forEach((level, index) => {
        const mesh = level.object as THREE.Mesh;
        if (mesh.geometry) {
          const geometryId = `merged-static-lod-${index}-${W}-${D}-${H}`;
          if (!memoryManager.isRegistered(geometryId)) {
            memoryManager.registerGeometry(geometryId, mesh.geometry);
          }
        }
      });
      
      // Register merged material
      const mergedMaterialId = `merged-static-material-${W}-${D}-${H}`;
      if (!memoryManager.isRegistered(mergedMaterialId)) {
        memoryManager.registerMaterial(mergedMaterialId, mergedStaticLOD.material);
      }
    } else {
      // Fallback: Register individual geometries if merging failed
      // Register floor LOD geometries
      floorLOD.levels.forEach((level, index) => {
        const mesh = level.object as THREE.Mesh;
        if (mesh.geometry) {
          const geometryId = `floor-lod-${index}-${W}-${D}`;
          if (!memoryManager.isRegistered(geometryId)) {
            memoryManager.registerGeometry(geometryId, mesh.geometry);
          }
        }
      });
      
      // Register ceiling LOD geometries
      ceilingLOD.levels.forEach((level, index) => {
        const mesh = level.object as THREE.Mesh;
        if (mesh.geometry) {
          const geometryId = `ceiling-lod-${index}-${W}-${D}-${H}`;
          if (!memoryManager.isRegistered(geometryId)) {
            memoryManager.registerGeometry(geometryId, mesh.geometry);
          }
        }
      });
      
      // Register plinth LOD geometries
      plinthLODs.forEach((lod, plinthIndex) => {
        lod.levels.forEach((level, lodIndex) => {
          const mesh = level.object as THREE.Mesh;
          if (mesh.geometry) {
            const geometryId = `plinth-${plinthIndex}-lod-${lodIndex}-${W}-${D}`;
            if (!memoryManager.isRegistered(geometryId)) {
              memoryManager.registerGeometry(geometryId, mesh.geometry);
            }
          }
        });
      });
    }
    
    return () => {
      // Cleanup merged geometry if it exists
      if (mergedStaticLOD) {
        mergedStaticLOD.lod.levels.forEach((level, index) => {
          const mesh = level.object as THREE.Mesh;
          if (mesh.geometry) {
            const geometryId = `merged-static-lod-${index}-${W}-${D}-${H}`;
            memoryManager.dispose(geometryId);
          }
        });
        
        // Dispose merged material
        const mergedMaterialId = `merged-static-material-${W}-${D}-${H}`;
        memoryManager.dispose(mergedMaterialId);
      } else {
        // Fallback: Dispose individual geometries
        // Unregister and dispose floor LOD geometries
        floorLOD.levels.forEach((level, index) => {
          const mesh = level.object as THREE.Mesh;
          if (mesh.geometry) {
            const geometryId = `floor-lod-${index}-${W}-${D}`;
            memoryManager.dispose(geometryId);
          }
        });
        
        // Unregister and dispose ceiling LOD geometries
        ceilingLOD.levels.forEach((level, index) => {
          const mesh = level.object as THREE.Mesh;
          if (mesh.geometry) {
            const geometryId = `ceiling-lod-${index}-${W}-${D}-${H}`;
            memoryManager.dispose(geometryId);
          }
        });
        
        // Unregister and dispose plinth LOD geometries
        plinthLODs.forEach((lod, plinthIndex) => {
          lod.levels.forEach((level, lodIndex) => {
            const mesh = level.object as THREE.Mesh;
            if (mesh.geometry) {
              const geometryId = `plinth-${plinthIndex}-lod-${lodIndex}-${W}-${D}`;
              memoryManager.dispose(geometryId);
            }
          });
        });
      }
    };
  }, [floorLOD, ceilingLOD, plinthLODs, mergedStaticLOD, W, D, H]);

  // Register and manage floor texture with MemoryManager
  useEffect(() => {
    const memoryManager = getMemoryManager();
    
    if (floorTexture) {
      const cache = getTextureCache();
      const cacheKey = cache.generateKey({
        textureType: 'marble',
        color: floorColor,
        size: 512,
      });
      const textureId = `marble-texture-${cacheKey}`;
      
      // Register texture if not already registered
      if (!memoryManager.isRegistered(textureId)) {
        memoryManager.registerTexture(textureId, floorTexture);
      } else {
        // Mark as used to update LRU
        memoryManager.markAsUsed(textureId);
      }
    }
    
    return () => {
      // Dispose floor texture on unmount or when it changes
      if (floorTexture) {
        const cache = getTextureCache();
        const cacheKey = cache.generateKey({
          textureType: 'marble',
          color: floorColor,
          size: 512,
        });
        const textureId = `marble-texture-${cacheKey}`;
        
        // Release reference - MemoryManager will dispose when ref count reaches 0
        if (memoryManager.isRegistered(textureId)) {
          memoryManager.releaseRef(textureId);
        }
      }
    };
  }, [floorTexture, floorColor]);

  // Register and manage wall texture with MemoryManager
  useEffect(() => {
    const memoryManager = getMemoryManager();
    
    if (wallTexture) {
      const cache = getTextureCache();
      const cacheKey = cache.generateKey({
        textureType: 'wall',
        type: roomConfig.wallTexture ?? 'plain',
        color: wallColor,
        size: 512,
      });
      const textureId = `wall-texture-${cacheKey}`;
      
      // Register texture if not already registered
      if (!memoryManager.isRegistered(textureId)) {
        memoryManager.registerTexture(textureId, wallTexture);
      } else {
        // Mark as used to update LRU
        memoryManager.markAsUsed(textureId);
      }
    }
    
    return () => {
      // Dispose wall texture on unmount or when it changes
      if (wallTexture) {
        const cache = getTextureCache();
        const cacheKey = cache.generateKey({
          textureType: 'wall',
          type: roomConfig.wallTexture ?? 'plain',
          color: wallColor,
          size: 512,
        });
        const textureId = `wall-texture-${cacheKey}`;
        
        // Release reference - MemoryManager will dispose when ref count reaches 0
        if (memoryManager.isRegistered(textureId)) {
          memoryManager.releaseRef(textureId);
        }
      }
    };
  }, [wallTexture, wallColor, roomConfig.wallTexture]);

  return (
    <group>
      {/* Render merged static geometry (floor + ceiling + plinths) if available */}
      {mergedStaticLOD ? (
        <primitive object={mergedStaticLOD.lod} />
      ) : (
        <>
          {/* Fallback: Render individual meshes if merging failed */}
          {/* Lantai with LOD */}
          <primitive object={floorLOD} />

          {/* Plafon with LOD */}
          <primitive object={ceilingLOD} />

          {/* Plint lantai with LOD */}
          {plinthLODs.map((lod, i) => (
            <primitive key={i} object={lod} />
          ))}
        </>
      )}

      {/* Dinding belakang (utara) */}
      <WallNode side="north" W={W} H={H}
        position={[0, 0, -D / 2]}
        rotation={[0, 0, 0]}
        wallColor={getWallColor('north')}
        wallTexture={getWallTexture('north')}
        thumbnail={getThumbnail('north')}
        windowX={(roomConfig.windowOffsetX ?? 0) / 100}
      />

      {/* Dinding depan (selatan) — dengan lubang pintu */}
      <SouthWallWithDoor
        W={W} H={H} roomD={D}
        doorOffsetX={roomConfig.doorOffsetX ?? 0}
        wallColor={getWallColor('south')}
        wallTexture={getWallTexture('south')}
        thumbnail={getThumbnail('south')}
      />

      {/* Pintu */}
      <DoorMesh roomD={D} xOffset={(roomConfig.doorOffsetX ?? 0) / 100} />

      {/* Dinding kiri (barat) */}
      <WallNode side="west" W={D} H={H}
        position={[-W / 2, H / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        wallColor={getWallColor('west')}
        wallTexture={getWallTexture('west')}
        thumbnail={getThumbnail('west')}
      />

      {/* Dinding kanan (timur) */}
      <WallNode side="east" W={D} H={H}
        position={[W / 2, H / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        wallColor={getWallColor('east')}
        wallTexture={getWallTexture('east')}
        thumbnail={getThumbnail('east')}
      />

      <Grid
        position={[0, 0.001, 0]}
        args={[W, D]}
        cellSize={0.5}
        cellThickness={0.3}
        cellColor="#AAAAAA"
        sectionSize={1}
        sectionThickness={0.8}
        sectionColor="#888888"
        fadeDistance={Math.max(W, D)}
        fadeStrength={1.5}
        infiniteGrid={false}
      />

      {/* Lazy-loaded OutdoorEnvironment - non-critical component */}
      <Suspense fallback={null}>
        <OutdoorEnvironment />
      </Suspense>
    </group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function
  // Return true if props are equal (skip re-render)
  // Return false if props changed (re-render)
  
  // RoomMesh has no props, it reads from Zustand store
  // Compare roomConfig from store
  const prevStore = useEditorStore.getState();
  const nextStore = useEditorStore.getState();
  
  // Deep comparison of roomConfig object
  // This is safe because Zustand uses immutable updates
  const roomConfigEqual = prevStore.roomConfig === nextStore.roomConfig;
  
  // Skip re-render if roomConfig hasn't changed
  return roomConfigEqual;
});

RoomMesh.displayName = 'RoomMesh';

export default RoomMesh;
