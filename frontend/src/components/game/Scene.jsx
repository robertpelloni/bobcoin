import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Note } from './Note';

function GridFloor({ color }) {
    const mesh = useRef();

    useFrame((state) => {
        mesh.current.position.z = (state.clock.getElapsedTime() * 5) % 2;
    });

    return (
        <group>
            <gridHelper args={[20, 20, color, 0x111111]} position={[0, -2.5, 0]} rotation={[0, 0, 0]} />
            <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.55, 0]}>
                <planeGeometry args={[20, 20, 20, 20]} />
                <meshBasicMaterial color="#000" wireframe opacity={0.2} transparent />
            </mesh>
        </group>
    );
}

function MovingStars({ color }) {
    const count = 500;
    const mesh = useRef();

    const dummy = useMemo(() => new THREE.Object3D(), []);
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const factor = 20 + Math.random() * 100;
            const speed = 0.01 + Math.random() / 200;
            const x = Math.random() * 100 - 50;
            const y = Math.random() * 100 - 50;
            const z = Math.random() * 100 - 50;
            temp.push({ factor, speed, x, y, z });
        }
        return temp;
    }, [count]);

    useFrame((state) => {
        particles.forEach((particle, i) => {
            let { speed, x, y, z } = particle;
            z += speed * 5;
            if (z > 10) z = -50;
            particle.z = z;

            dummy.position.set(x, y, z);
            dummy.scale.setScalar(0.1);
            dummy.updateMatrix();
            mesh.current.setMatrixAt(i, dummy.matrix);
        });
        mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[null, null, count]}>
            <dodecahedronGeometry args={[0.2, 0]} />
            <meshBasicMaterial color={color} />
        </instancedMesh>
    );
}

export function Scene({ notes, activeTheme }) {
    // Theme logic based on string (e.g., 'theme_matrix', 'theme_neon')
    const isMatrix = activeTheme === 'theme_matrix';
    const bgColor = isMatrix ? '#001100' : '#050505';
    const gridColor = isMatrix ? '#00ff00' : '#ff00ff';
    const starColor = isMatrix ? '#00ff00' : '#00ffff';
    const noteColor = isMatrix ? '#00ff00' : '#ff00ff';

    return (
        <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
            <color attach="background" args={[bgColor]} />

            {/* Lighting */}
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={1} color={starColor} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color={gridColor} />

            <MovingStars color={starColor} />
            <GridFloor color={gridColor} />

            {/* Lanes */}
            <group position={[0, -2, 0]}>
                {[ -1.5, -0.5, 0.5, 1.5 ].map((x, i) => (
                    <mesh key={i} position={[x, 0, -10]} rotation={[-Math.PI / 2, 0, 0]}>
                        <boxGeometry args={[0.05, 40, 0.05]} />
                        <meshStandardMaterial color={isMatrix ? '#003300' : '#333'} emissive="#111" />
                    </mesh>
                ))}
            </group>

            {/* Hit Line */}
            <mesh position={[0, -2, 0]}>
                <boxGeometry args={[4, 0.05, 0.05]} />
                <meshStandardMaterial color={isMatrix ? '#0f0' : '#fff'} emissive={isMatrix ? '#0f0' : '#fff'} emissiveIntensity={2} />
            </mesh>

            {/* Notes */}
            {notes.map(note => (
                <Note
                    key={note.id}
                    position={[(note.lane * 1) - 1.5, -2, note.z]}
                    color={note.hit ? "#fff" : noteColor}
                />
            ))}

            <EffectComposer disableNormalPass>
                <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} opacity={isMatrix ? 2.0 : 1.5} />
                <Noise opacity={isMatrix ? 0.1 : 0.05} />
            </EffectComposer>

            <fog attach="fog" args={[bgColor, 5, 20]} />
        </Canvas>
    );
}
