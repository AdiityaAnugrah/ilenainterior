'use client';
import { useEditorStore } from '@/store/editorStore';

// Linear LED bar — panjang, tipis, modern.
// `isNight` mengatur seberapa terang lampu indoor:
//   - malam: full brightness, jadi sumber cahaya utama
//   - siang: dim — di dunia nyata lampu jarang dinyalain siang hari
function LinearLight({
  z, width, height, isNight,
}: { z: number; width: number; height: number; isNight: boolean }) {
  const len = width * 0.72;
  const thick = 0.035;
  const tall = 0.028;

  // Titik cahaya tersebar sepanjang bar
  const lightCount = Math.max(2, Math.round(len / 1.2));
  const lights: number[] = [];
  for (let i = 0; i < lightCount; i++) {
    lights.push(-len / 2 + (len / (lightCount - 1)) * i);
  }

  // Intensitas per-mode
  const emissiveIntensity = isNight ? 6 : 1.2;     // glow material LED
  const pointIntensity    = isNight ? 3.5 : 0.6;    // cahaya jatuh ke ruangan
  const lightColor        = isNight ? '#FFE6B0' : '#FFF8F0'; // malam lebih warm

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
          emissive={lightColor}
          emissiveIntensity={emissiveIntensity}
          roughness={1}
          metalness={0}
        />
      </mesh>
      {/* Point lights tersebar */}
      {lights.map((lx, i) => (
        <pointLight
          key={i}
          position={[lx, -0.08, 0]}
          intensity={pointIntensity}
          color={lightColor}
          distance={height * 2.5}
          decay={2}
        />
      ))}
    </group>
  );
}

export default function Lights() {
  const { timeOfDay, roomConfig } = useEditorStore();
  const W = roomConfig.width;
  const D = roomConfig.depth;
  const H = roomConfig.height;
  const isNight = timeOfDay === 'night';

  // 1 bar untuk ruangan kecil, 2 bar paralel untuk ruangan lebih besar
  const barCount = D >= 4 ? 2 : 1;
  const zPositions = barCount === 1
    ? [0]
    : [-D * 0.2, D * 0.2];

  // Ambient indoor:
  //   - siang: turun ke 0.30 (sebelumnya 0.65). Outdoor sun/sky lewat
  //     ambientLight+directionalLight di OutdoorEnvironment yang dominan.
  //   - malam: 0.12 (sebelumnya 0.55). Biar lampu indoor jadi sumber utama
  //     dan ruangan terasa gelap-kontras seperti malam beneran.
  const ambientColor     = isNight ? '#3A4A6A' : '#FFF8F0'; // malam cool blue
  const ambientIntensity = isNight ? 0.12 : 0.30;

  return (
    <>
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      {zPositions.map((z, i) => (
        <LinearLight key={i} z={z} width={W} height={H} isNight={isNight} />
      ))}
    </>
  );
}
