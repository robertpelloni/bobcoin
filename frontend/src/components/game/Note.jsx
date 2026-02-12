import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export function Note({ position, color }) {
    return (
        <mesh position={position}>
            <boxGeometry args={[0.8, 0.2, 0.5]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
        </mesh>
    );
}
