'use client';
import { useThree } from '@react-three/fiber';
import { useEditorStore } from '@/store/editorStore';

const MAP_SIZE = 120;

export default function MiniMap() {
  const { roomConfig, items } = useEditorStore();
  const { camera } = useThree();

  const scaleX = MAP_SIZE / roomConfig.width;
  const scaleZ = MAP_SIZE / roomConfig.depth;

  const camX = ((camera.position.x + roomConfig.width / 2) * scaleX);
  const camZ = ((camera.position.z + roomConfig.depth / 2) * scaleZ);

  return null;
}

interface MiniMapOverlayProps {
  cameraPos: { x: number; z: number };
  cameraAngle: number;
}

export function MiniMapOverlay({ cameraPos, cameraAngle }: MiniMapOverlayProps) {
  const { roomConfig, items } = useEditorStore();

  const scaleX = MAP_SIZE / roomConfig.width;
  const scaleZ = MAP_SIZE / roomConfig.depth;

  const camMapX = (cameraPos.x + roomConfig.width / 2) * scaleX;
  const camMapZ = (cameraPos.z + roomConfig.depth / 2) * scaleZ;

  return (
    <div
      className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl border border-stone-200 shadow-lg overflow-hidden"
      style={{ width: MAP_SIZE, height: MAP_SIZE }}
    >
      <svg width={MAP_SIZE} height={MAP_SIZE}>
        {/* Room */}
        <rect x={0} y={0} width={MAP_SIZE} height={MAP_SIZE} fill="#F5F5F0" />

        {/* Items */}
        {items.map((item) => {
          const ix = (item.position.x / 100) * scaleX;
          const iz = (item.position.y / 100) * scaleZ;
          const iw = (item.dimensions.width / 100) * scaleX;
          const id = (item.dimensions.depth / 100) * scaleZ;
          return (
            <rect
              key={item.id}
              x={ix} y={iz} width={iw} height={id}
              fill="#A8A29E" opacity={0.7} rx={1}
            />
          );
        })}

        {/* Camera indicator */}
        {camMapX >= 0 && camMapX <= MAP_SIZE && (
          <g transform={`translate(${camMapX}, ${camMapZ}) rotate(${cameraAngle})`}>
            <polygon points="0,-6 -4,4 4,4" fill="#1c1917" opacity={0.9} />
          </g>
        )}

        {/* Border */}
        <rect x={0} y={0} width={MAP_SIZE} height={MAP_SIZE}
          fill="none" stroke="#1c1917" strokeWidth={2} />
      </svg>
      <p className="text-[9px] text-stone-400 text-center pb-0.5">Mini-map</p>
    </div>
  );
}
