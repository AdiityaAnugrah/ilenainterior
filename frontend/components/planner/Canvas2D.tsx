'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore, PlacedItem } from '@/store/editorStore';
import { v4 as uuidv4 } from 'uuid';

const PX_PER_CM = 1;
const GRID_CM = 100;

// ── OBB Collision (SAT) ──────────────────────────────────────────────────────

function getCorners(item: PlacedItem, pos?: { x: number; y: number }): [number, number][] {
  const p = pos ?? item.position;
  const cx = p.x + item.dimensions.width / 2;
  const cy = p.y + item.dimensions.depth / 2;
  const hw = item.dimensions.width / 2;
  const hd = item.dimensions.depth / 2;
  const a = (item.rotation * Math.PI) / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  return ([ [-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd] ] as [number,number][])
    .map(([lx, ly]) => [cx + lx*cos - ly*sin, cy + lx*sin + ly*cos]);
}

function projRange(corners: [number,number][], ax: [number,number]): [number,number] {
  const dots = corners.map(([x,y]) => x*ax[0] + y*ax[1]);
  return [Math.min(...dots), Math.max(...dots)];
}

function obbOverlap(a: PlacedItem, b: PlacedItem, posA?: { x: number; y: number }): boolean {
  const ca = getCorners(a, posA);
  const cb = getCorners(b);
  const axes: [number,number][] = [
    [ca[1][0]-ca[0][0], ca[1][1]-ca[0][1]],
    [ca[3][0]-ca[0][0], ca[3][1]-ca[0][1]],
    [cb[1][0]-cb[0][0], cb[1][1]-cb[0][1]],
    [cb[3][0]-cb[0][0], cb[3][1]-cb[0][1]],
  ];
  for (const ax of axes) {
    const [a0,a1] = projRange(ca, ax);
    const [b0,b1] = projRange(cb, ax);
    if (a1 <= b0 || b1 <= a0) return false;
  }
  return true;
}

function collides(item: PlacedItem, allItems: PlacedItem[], pos?: { x: number; y: number }): boolean {
  return allItems.some(o => o.id !== item.id && obbOverlap(item, o, pos));
}

// Clamp item position so the rotated AABB stays inside the room.
// Position is top-left of the UNROTATED rect; rotation is around its center.
function clampPos(
  item: PlacedItem,
  pos: { x: number; y: number },
  roomW: number,
  roomD: number,
): { x: number; y: number } {
  const hw  = item.dimensions.width  / 2;
  const hd  = item.dimensions.depth  / 2;
  const rad = (item.rotation * Math.PI) / 180;
  const c   = Math.abs(Math.cos(rad));
  const s   = Math.abs(Math.sin(rad));
  // Half-extents of the axis-aligned bounding box after rotation
  const aabbHW = hw * c + hd * s;
  const aabbHD = hw * s + hd * c;
  // Center of the item at the proposed position
  const cx = pos.x + hw;
  const cy = pos.y + hd;
  // Clamp center so AABB stays in [0,roomW] × [0,roomD]
  const clampedCx = Math.max(aabbHW, Math.min(roomW - aabbHW, cx));
  const clampedCy = Math.max(aabbHD, Math.min(roomD - aabbHD, cy));
  return { x: clampedCx - hw, y: clampedCy - hd };
}

// Spiral search for nearest free position
function findFreePos(
  item: PlacedItem,
  allItems: PlacedItem[],
  preferred: { x: number; y: number },
  roomW: number,
  roomD: number,
): { x: number; y: number } | null {
  const clamped = clampPos(item, preferred, roomW, roomD);
  if (!collides({ ...item, position: clamped }, allItems)) return clamped;

  const step = Math.max(item.dimensions.width, item.dimensions.depth, 50);
  for (let r = step; r <= Math.max(roomW, roomD) * 2; r += step) {
    for (let angle = 0; angle < 360; angle += 30) {
      const rad = (angle * Math.PI) / 180;
      const pos = clampPos(item, { x: clamped.x + r * Math.cos(rad), y: clamped.y + r * Math.sin(rad) }, roomW, roomD);
      if (!collides({ ...item, position: pos }, allItems)) return pos;
    }
  }
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────

interface Canvas2DProps {
  pendingProduct: {
    id: number;
    name: string;
    thumbnail: string;
    price: number;
    category: string;
    dimensions: { width: number; depth: number; height: number };
  } | null;
  onProductPlaced: () => void;
}

export default function Canvas2D({ pendingProduct, onProductPlaced }: Canvas2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { roomConfig, items, selectedItemId, addItem, updateItem, setSelectedItem, setRoomConfig } = useEditorStore();

  const SCALE = useRef(0.6);
  const offset = useRef({ x: 60, y: 60 });

  const dragging = useRef<{
    itemId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    lastValidPos: { x: number; y: number };
    invalid: boolean;
  } | null>(null);

  const isDraggingCanvas = useRef(false);
  const canvasDragStart = useRef({ x: 0, y: 0, offX: 0, offY: 0 });

  const wallFeatureDrag = useRef<{
    type: 'door' | 'window';
    startCanvasX: number;
    origOffsetX: number;
  } | null>(null);

  const roomW = roomConfig.width * 100;
  const roomD = roomConfig.depth * 100;

  // Ref to current items so draw callbacks can access latest without stale closure
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = SCALE.current;
    const off = offset.current;
    const currentItems = itemsRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#f5f5f4';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    const gridPx = GRID_CM * scale;
    const startX = ((off.x % gridPx) + gridPx) % gridPx;
    const startY = ((off.y % gridPx) + gridPx) % gridPx;
    for (let x = startX; x < canvas.width; x += gridPx) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = startY; y < canvas.height; y += gridPx) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Room
    const rx = off.x;
    const ry = off.y;
    const rw = roomW * scale;
    const rh = roomD * scale;

    ctx.fillStyle = '#fafaf9';
    ctx.fillRect(rx, ry, rw, rh);

    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 4;
    ctx.strokeRect(rx, ry, rw, rh);

    // Door (south wall — draggable)
    const doorOffCm = roomConfig.doorOffsetX ?? 0;
    const doorPxW   = 90 * scale;
    const doorCx    = rx + (roomW / 2 + doorOffCm) * scale;
    ctx.clearRect(doorCx - doorPxW / 2, ry + rh - 3, doorPxW, 6);
    ctx.fillStyle = '#d6d3d1';
    ctx.fillRect(doorCx - doorPxW / 2, ry + rh - 1, doorPxW, 2);
    // Swing arc
    ctx.save();
    ctx.strokeStyle = '#a8a29e';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(doorCx - doorPxW / 2, ry + rh, doorPxW, -Math.PI / 2, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    // Drag hint
    ctx.fillStyle = '#78716c';
    ctx.font = `10px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('⟺', doorCx, ry + rh + 14);

    // Window (north wall — draggable)
    const winOffCm  = roomConfig.windowOffsetX ?? 0;
    const winWCm    = Math.min(140, roomW * 0.35);
    const winPxW    = winWCm * scale;
    const winCx     = rx + (roomW / 2 + winOffCm) * scale;
    ctx.clearRect(winCx - winPxW / 2, ry - 3, winPxW, 6);
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(winCx - winPxW / 2, ry - 1, winPxW, 2);
    // Drag hint
    ctx.fillStyle = '#78716c';
    ctx.textAlign = 'center';
    ctx.fillText('⟺', winCx, ry - 10);

    // Grid inside room
    ctx.strokeStyle = 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= roomW; x += GRID_CM) {
      ctx.beginPath(); ctx.moveTo(rx + x * scale, ry); ctx.lineTo(rx + x * scale, ry + rh); ctx.stroke();
    }
    for (let y = 0; y <= roomD; y += GRID_CM) {
      ctx.beginPath(); ctx.moveTo(rx, ry + y * scale); ctx.lineTo(rx + rw, ry + y * scale); ctx.stroke();
    }

    // Dimension labels
    ctx.fillStyle = '#78716c';
    ctx.font = `${12}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${roomConfig.width}m`, rx + rw / 2, ry - 8);
    ctx.save();
    ctx.translate(rx - 16, ry + rh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${roomConfig.depth}m`, 0, 0);
    ctx.restore();

    // Compute which items are colliding
    const collidingIds = new Set<string>();
    for (let i = 0; i < currentItems.length; i++) {
      for (let j = i + 1; j < currentItems.length; j++) {
        if (obbOverlap(currentItems[i], currentItems[j])) {
          collidingIds.add(currentItems[i].id);
          collidingIds.add(currentItems[j].id);
        }
      }
    }

    // Items
    currentItems.forEach((item) => {
      const ix = rx + item.position.x * scale;
      const iy = ry + item.position.y * scale;
      const iw = item.dimensions.width * scale;
      const id2 = item.dimensions.depth * scale;
      const isSelected = item.id === selectedItemId;
      const isColliding = collidingIds.has(item.id);

      ctx.save();
      ctx.translate(ix + iw / 2, iy + id2 / 2);
      ctx.rotate((item.rotation * Math.PI) / 180);

      ctx.shadowColor = 'rgba(0,0,0,0.12)';
      ctx.shadowBlur = isSelected ? 12 : 6;
      ctx.shadowOffsetY = 2;

      // Body color: red if colliding, normal otherwise
      ctx.fillStyle = isColliding
        ? (isSelected ? '#fca5a5' : '#fee2e2')
        : (isSelected ? '#e7e5e4' : '#f5f5f4');
      ctx.strokeStyle = isColliding
        ? '#ef4444'
        : (isSelected ? '#1c1917' : '#a8a29e');
      ctx.lineWidth = isColliding ? 2.5 : (isSelected ? 2 : 1);

      ctx.fillRect(-iw / 2, -id2 / 2, iw, id2);
      ctx.strokeRect(-iw / 2, -id2 / 2, iw, id2);

      ctx.shadowColor = 'transparent';

      // Label
      ctx.fillStyle = isColliding ? '#b91c1c' : '#57534e';
      ctx.font = `${Math.max(9, 11 * scale)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      const label = item.name.length > 12 ? item.name.slice(0, 12) + '…' : item.name;
      ctx.fillText(label, 0, 4);

      ctx.restore();
    });
  }, [items, selectedItemId, roomConfig, roomW, roomD]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      draw();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  const canvasToRoom = (cx: number, cy: number) => ({
    x: (cx - offset.current.x) / SCALE.current,
    y: (cy - offset.current.y) / SCALE.current,
  });

  const getItemAt = (cx: number, cy: number) => {
    const room = canvasToRoom(cx, cy);
    return [...items].reverse().find((item) => {
      const hw = item.dimensions.width / 2;
      const hd = item.dimensions.depth / 2;
      const cx2 = item.position.x + hw;
      const cy2 = item.position.y + hd;
      const dx = room.x - cx2;
      const dy = room.y - cy2;
      const angle = -(item.rotation * Math.PI) / 180;
      const lx = dx * Math.cos(angle) - dy * Math.sin(angle);
      const ly = dx * Math.sin(angle) + dy * Math.cos(angle);
      return Math.abs(lx) <= hw && Math.abs(ly) <= hd;
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    // Door drag hit (south wall)
    const sc = SCALE.current;
    const ox = offset.current.x;
    const oy = offset.current.y;
    const dOff = roomConfig.doorOffsetX ?? 0;
    const dCx  = ox + (roomW / 2 + dOff) * sc;
    const dCy  = oy + roomD * sc;
    if (Math.abs(cx - dCx) <= 45 * sc + 10 && Math.abs(cy - dCy) <= 14) {
      wallFeatureDrag.current = { type: 'door', startCanvasX: cx, origOffsetX: dOff };
      return;
    }

    // Window drag hit (north wall)
    const wOff  = roomConfig.windowOffsetX ?? 0;
    const winWCm = Math.min(140, roomW * 0.35);
    const wCx   = ox + (roomW / 2 + wOff) * sc;
    const wCy   = oy;
    if (Math.abs(cx - wCx) <= winWCm / 2 * sc + 10 && Math.abs(cy - wCy) <= 14) {
      wallFeatureDrag.current = { type: 'window', startCanvasX: cx, origOffsetX: wOff };
      return;
    }

    const hit = getItemAt(cx, cy);
    if (hit) {
      setSelectedItem(hit.id);
      dragging.current = {
        itemId: hit.id,
        startX: cx,
        startY: cy,
        origX: hit.position.x,
        origY: hit.position.y,
        lastValidPos: { ...hit.position },
        invalid: false,
      };
    } else {
      setSelectedItem(null);
      isDraggingCanvas.current = true;
      canvasDragStart.current = { x: cx, y: cy, offX: offset.current.x, offY: offset.current.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (wallFeatureDrag.current) {
      const { type, startCanvasX, origOffsetX } = wallFeatureDrag.current;
      const deltaCm = (cx - startCanvasX) / SCALE.current;
      if (type === 'door') {
        const maxOff = roomW / 2 - 45 - 5;
        setRoomConfig({ doorOffsetX: Math.max(-maxOff, Math.min(maxOff, origOffsetX + deltaCm)) });
      } else {
        const winHalfCm = Math.min(140, roomW * 0.35) / 2;
        const maxOff = roomW / 2 - winHalfCm - 5;
        setRoomConfig({ windowOffsetX: Math.max(-maxOff, Math.min(maxOff, origOffsetX + deltaCm)) });
      }
      return;
    }

    if (dragging.current) {
      const d = dragging.current;
      const dx = (cx - d.startX) / SCALE.current;
      const dy = (cy - d.startY) / SCALE.current;
      const item = itemsRef.current.find(i => i.id === d.itemId);
      if (!item) return;

      const newPos = clampPos(item, { x: d.origX + dx, y: d.origY + dy }, roomW, roomD);

      const isColliding = collides(item, itemsRef.current, newPos);
      if (!isColliding) {
        d.lastValidPos = newPos;
        d.invalid = false;
      } else {
        d.invalid = true;
      }

      // Always move (show invalid state visually), snap on mouseup
      updateItem(d.itemId, { position: newPos });
    } else if (isDraggingCanvas.current) {
      offset.current = {
        x: canvasDragStart.current.offX + (cx - canvasDragStart.current.x),
        y: canvasDragStart.current.offY + (cy - canvasDragStart.current.y),
      };
      draw();
    }
  };

  const handleMouseUp = () => {
    wallFeatureDrag.current = null;
    if (dragging.current?.invalid) {
      // Snap back to last valid position
      updateItem(dragging.current.itemId, { position: dragging.current.lastValidPos });
    }
    dragging.current = null;
    isDraggingCanvas.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    SCALE.current = Math.max(0.2, Math.min(3, SCALE.current * factor));
    draw();
  };

  const handleDrop = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    const product = JSON.parse(raw);
    const rect = canvasRef.current!.getBoundingClientRect();
    const pos = canvasToRoom(e.clientX - rect.left, e.clientY - rect.top);
    const dims = product.dimensions || { width: 100, depth: 80, height: 80 };

    const draft: PlacedItem = {
      id: uuidv4(),
      productId: product.id,
      name: product.name,
      thumbnail: product.thumbnail,
      model3d: product.model_3d ?? null,
      price: product.price,
      category: product.category,
      dimensions: dims,
      position: { x: 0, y: 0 },
      elevation: 0,
      rotation: 0,
      scale: 1,
    };

    const freePos = findFreePos(draft, itemsRef.current, { x: pos.x - dims.width / 2, y: pos.y - dims.depth / 2 }, roomW, roomD);
    if (!freePos) return; // Room full, silently ignore

    draft.position = freePos;
    addItem(draft);
    setSelectedItem(draft.id);
    onProductPlaced();
  };

  useEffect(() => {
    if (!pendingProduct) return;
    const dims = pendingProduct.dimensions || { width: 100, depth: 80, height: 80 };
    const draft: PlacedItem = {
      id: uuidv4(),
      productId: pendingProduct.id,
      name: pendingProduct.name,
      thumbnail: pendingProduct.thumbnail,
      model3d: (pendingProduct as any).model_3d ?? null,
      price: pendingProduct.price,
      category: pendingProduct.category,
      dimensions: dims,
      position: { x: 0, y: 0 },
      elevation: 0,
      rotation: 0,
      scale: 1,
    };

    const preferred = {
      x: roomW / 2 - dims.width / 2,
      y: roomD / 2 - dims.depth / 2,
    };
    const freePos = findFreePos(draft, itemsRef.current, preferred, roomW, roomD);
    if (!freePos) return;

    draft.position = freePos;
    addItem(draft);
    setSelectedItem(draft.id);
    onProductPlaced();
  }, [pendingProduct]);

  return (
    <div className="relative flex-1 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-default"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      />

      {/* Toolbar overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-stone-200 px-3 py-2">
        <button
          onClick={() => { SCALE.current = Math.min(3, SCALE.current * 1.2); draw(); }}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-600 font-bold text-lg transition-colors"
          title="Zoom In"
        >+</button>
        <button
          onClick={() => { SCALE.current = Math.max(0.2, SCALE.current / 1.2); draw(); }}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-600 font-bold text-lg transition-colors"
          title="Zoom Out"
        >−</button>
        <div className="w-px h-4 bg-stone-200 mx-1" />
        <button
          onClick={() => { SCALE.current = 0.6; offset.current = { x: 60, y: 60 }; draw(); }}
          className="px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
          title="Reset View"
        >Reset</button>
      </div>

      {items.length === 0 && (
        <div className="absolute inset-0 flex items-end justify-center pb-20 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm border border-stone-100 text-center">
            <p className="text-sm text-stone-600 font-medium">Drag furniture dari panel kiri</p>
            <p className="text-xs text-stone-400 mt-0.5">atau klik produk untuk langsung taruh di tengah</p>
          </div>
        </div>
      )}
    </div>
  );
}
