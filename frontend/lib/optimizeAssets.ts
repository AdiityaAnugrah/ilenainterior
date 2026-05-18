'use client';

import { WebIO, type Document, type Texture } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, weld, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

export interface OptimizeStats {
  originalSize: number;
  optimizedSize: number;
  reductionPct: number;
}

export interface OptimizeGlbOptions {
  maxTextureSize?: number;
  textureQuality?: number;
  onStage?: (stage: string) => void;
}

export interface OptimizeImageOptions {
  maxDimension?: number;
  quality?: number;
  format?: 'webp' | 'jpeg';
}

const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

export const fmt = formatBytes;

async function resizeTextureInBrowser(
  data: Uint8Array,
  mimeType: string,
  maxDim: number,
  quality: number,
): Promise<{ data: Uint8Array; mimeType: string } | null> {
  try {
    const blob = new Blob([new Uint8Array(data)], { type: mimeType || 'image/png' });
    const bitmap = await createImageBitmap(blob);

    const { width, height } = bitmap;
    const longest = Math.max(width, height);
    if (longest <= maxDim) {
      bitmap.close?.();
      return null;
    }

    const scale = maxDim / longest;
    const newW = Math.round(width * scale);
    const newH = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = newW;
    canvas.height = newH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, newW, newH);
    bitmap.close?.();

    const targetMime = 'image/webp';
    const outBlob: Blob | null = await new Promise((res) =>
      canvas.toBlob(res, targetMime, quality),
    );
    if (!outBlob) return null;

    const buf = await outBlob.arrayBuffer();
    return { data: new Uint8Array(buf), mimeType: targetMime };
  } catch {
    return null;
  }
}

async function resizeAllTextures(
  doc: Document,
  maxDim: number,
  quality: number,
): Promise<void> {
  const textures: Texture[] = doc.getRoot().listTextures();
  for (const tex of textures) {
    const image = tex.getImage();
    if (!image) continue;
    const mime = tex.getMimeType() || 'image/png';
    const result = await resizeTextureInBrowser(image, mime, maxDim, quality);
    if (result) {
      tex.setImage(result.data);
      tex.setMimeType(result.mimeType);
    }
  }
}

export async function optimizeGlb(
  file: File,
  opts: OptimizeGlbOptions = {},
): Promise<{ blob: Blob; stats: OptimizeStats }> {
  const { maxTextureSize = 2048, textureQuality = 0.85, onStage } = opts;
  const originalSize = file.size;

  onStage?.('Membaca file GLB...');
  const buffer = new Uint8Array(await file.arrayBuffer());

  onStage?.('Menyiapkan encoder...');
  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;

  const io = new WebIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'meshopt.encoder': MeshoptEncoder,
      'meshopt.decoder': MeshoptDecoder,
    });

  onStage?.('Parsing geometri...');
  const doc = await io.readBinary(buffer);

  onStage?.('Menghilangkan duplikat & data tak terpakai...');
  await doc.transform(dedup(), prune(), weld());

  onStage?.('Mengompres tekstur...');
  await resizeAllTextures(doc, maxTextureSize, textureQuality);

  onStage?.('Kuantisasi mesh...');
  try {
    await doc.transform(quantize());
  } catch {
    /* quantize may fail on unusual rigs — skip silently */
  }

  onStage?.('Kompresi Meshopt...');
  try {
    doc.createExtension(EXTMeshoptCompression).setRequired(true);
    await doc.transform(
      meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
    );
  } catch {
    /* meshopt failed — keep document, still get dedup/prune/quantize benefit */
  }

  onStage?.('Menulis file akhir...');
  const out = await io.writeBinary(doc);
  const blob = new Blob([new Uint8Array(out)], { type: 'model/gltf-binary' });

  return {
    blob,
    stats: {
      originalSize,
      optimizedSize: blob.size,
      reductionPct: Math.max(0, Math.round((1 - blob.size / originalSize) * 100)),
    },
  };
}

export async function optimizeImage(
  file: File,
  opts: OptimizeImageOptions = {},
): Promise<{ blob: Blob; stats: OptimizeStats; filename: string }> {
  const { maxDimension = 2048, quality = 0.85, format = 'webp' } = opts;
  const originalSize = file.size;

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const longest = Math.max(width, height);
  const scale = longest > maxDimension ? maxDimension / longest : 1;
  const newW = Math.round(width * scale);
  const newH = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close?.();
    return {
      blob: file,
      stats: { originalSize, optimizedSize: originalSize, reductionPct: 0 },
      filename: file.name,
    };
  }
  ctx.drawImage(bitmap, 0, 0, newW, newH);
  bitmap.close?.();

  const mime = format === 'webp' ? 'image/webp' : 'image/jpeg';
  const blob: Blob = await new Promise((res, rej) => {
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error('toBlob failed'))),
      mime,
      quality,
    );
  });

  if (blob.size >= originalSize) {
    return {
      blob: file,
      stats: { originalSize, optimizedSize: originalSize, reductionPct: 0 },
      filename: file.name,
    };
  }

  const base = file.name.replace(/\.[^.]+$/, '');
  const ext = format === 'webp' ? 'webp' : 'jpg';
  return {
    blob,
    stats: {
      originalSize,
      optimizedSize: blob.size,
      reductionPct: Math.round((1 - blob.size / originalSize) * 100),
    },
    filename: `${base}.${ext}`,
  };
}
