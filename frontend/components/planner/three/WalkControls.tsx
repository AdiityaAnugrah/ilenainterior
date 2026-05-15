'use client';
import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SPEED = 3;

interface Props {
  active: boolean;
  onExit: () => void;
}

export default function WalkControls({ active, onExit }: Props) {
  const { camera, gl } = useThree();
  const keys    = useRef<Record<string, boolean>>({});
  const euler   = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const isLocked = useRef(false);
  const activeRef = useRef(active);

  useEffect(() => { activeRef.current = active; }, [active]);

  // Posisi awal kamera saat masuk walk mode
  useEffect(() => {
    if (!active) return;
    camera.position.set(0, 1.65, 0);
    euler.current.set(0, 0, 0);
    camera.quaternion.setFromEuler(euler.current);
  }, [active, camera]);

  // Keyboard
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === 'Escape') onExit();
    };
    const onUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [onExit]);

  // Mouse look — pointer lock jika tersedia, fallback ke mousemove biasa
  useEffect(() => {
    const onLockChange = () => {
      isLocked.current = document.pointerLockElement === gl.domElement;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!activeRef.current) return;
      // Kerja dengan pointer lock ATAU tanpa (gerak mouse di canvas)
      if (!isLocked.current && e.buttons !== 1) return;
      euler.current.y -= e.movementX * 0.002;
      euler.current.x -= e.movementY * 0.002;
      euler.current.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
    };

    document.addEventListener('pointerlockchange', onLockChange);
    window.addEventListener('mousemove', onMouseMove);
    return () => {
      document.removeEventListener('pointerlockchange', onLockChange);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [camera, gl]);

  // Movement per frame
  useFrame((_, delta) => {
    if (!activeRef.current) return;

    const k = keys.current;
    const moving =
      k['KeyW'] || k['KeyS'] || k['KeyA'] || k['KeyD'] ||
      k['ArrowUp'] || k['ArrowDown'] || k['ArrowLeft'] || k['ArrowRight'];
    if (!moving) return;

    const forward = new THREE.Vector3(-Math.sin(euler.current.y), 0, -Math.cos(euler.current.y));
    const right   = new THREE.Vector3( Math.cos(euler.current.y), 0, -Math.sin(euler.current.y));
    const move    = new THREE.Vector3();

    if (k['KeyW'] || k['ArrowUp'])    move.addScaledVector(forward,  SPEED * delta);
    if (k['KeyS'] || k['ArrowDown'])  move.addScaledVector(forward, -SPEED * delta);
    if (k['KeyA'] || k['ArrowLeft'])  move.addScaledVector(right,   -SPEED * delta);
    if (k['KeyD'] || k['ArrowRight']) move.addScaledVector(right,    SPEED * delta);

    camera.position.add(move);
    camera.position.y = 1.65; // tetap di ketinggian mata
  });

  return null;
}
