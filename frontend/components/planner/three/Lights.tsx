'use client';
import { useEditorStore } from '@/store/editorStore';

// Linear LED bar — panjang, tipis, modern
function LinearLight({ z, width, height }: { z: number; width: number; height: number }) {
  const len = width * 0.72;
  const thick = 0.035;
  const tall = 0.028;
  // Titik cahaya tersebar sepanjang bar
  const lightCount = Math.max(2, Math.round(len / 1.2));
  const lights: number[] = [];
  for (let i = 0; i < lightCount; i++) {
    lights.push(-len / 2 + (len / (lightCount - 1)) * i);
  }

  return (
    <group position={[0, height - 0.001, z]}>
      {/* Housing chrome */}
      <mesh>
        <boxGeometry args={[len, tall, thick]} />
        <meshStandardMaterial color="#D0D0D0" roughness={0.1} metalness={0.95} />
      </mesh>
      {/* LED strip emissive — menghadap bawah */}
      <mesh position={[0, -tall / 2 - 0.001, 0]}>
        <boxGeometry args={[len - 0.01, 0.002, thick - 0.01]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive="#FFF8F0"
          emissiveIntensity={6}
          roughness={1}
          metalness={0}
        />
      </mesh>
      {/* Point lights tersebar */}
      {lights.map((lx, i) => (
        <pointLight key={i} position={[lx, -0.08, 0]} intensity={4} color="#FFF8F0" distance={height * 2.5} decay={2} />
      ))}
    </group>
  );
}

export default function Lights() {
  const { timeOfDay, roomConfig } = useEditorStore();
  const W = roomConfig.width;
  const D = roomConfig.depth;
  const H = roomConfig.height;

  // 1 bar untuk ruangan kecil, 2 bar paralel untuk ruangan lebih besar
  const barCount = D >= 4 ? 2 : 1;
  const zPositions = barCount === 1
    ? [0]
    : [-D * 0.2, D * 0.2];

  const ambientColor     = timeOfDay === 'night' ? '#FFE8B0' : '#FFF8F0';
  const ambientIntensity = timeOfDay === 'night' ? 0.55 : 0.65;

  return (
    <>
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      {zPositions.map((z, i) => (
        <LinearLight key={i} z={z} width={W} height={H} />
      ))}
    </>
  );
}
