import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Note } from './Note';

function GridFloor() {
    const mesh = useRef();

    useFrame((state) => {
        // Move grid towards camera
        mesh.current.position.z = (state.clock.getElapsedTime() * 5) % 2;
    });

    return (
        <group>
            <gridHelper args={[20, 20, 0xff00ff, 0x111111]} position={[0, -2.5, 0]} rotation={[0, 0, 0]} />
            <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.55, 0]}>
                <planeGeometry args={[20, 20, 20, 20]} />
                <meshBasicMaterial color="#000" wireframe opacity={0.2} transparent />
            </mesh>
        </group>
    );
}

function MovingStars() {
    const count = 500;
    const mesh = useRef();

    const dummy = useMemo(() => new THREE.Object3D(), []);
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const t = Math.random() * 100;
            const factor = 20 + Math.random() * 100;
            const speed = 0.01 + Math.random() / 200;
            const x = Math.random() * 100 - 50;
            const y = Math.random() * 100 - 50;
            const z = Math.random() * 100 - 50;
            temp.push({ t, factor, speed, x, y, z, mx: 0, my: 0 });
        }
        return temp;
    }, [count]);

    useFrame((state) => {
        particles.forEach((particle, i) => {
            let { t, factor, speed, x, y, z } = particle;
            // Move particles towards camera
            z += speed * 5;
            if (z > 10) z = -50; // Reset
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
            <meshBasicMaterial color="#0ff" />
        </instancedMesh>
    );
}

export function Scene({ notes }) {
    return (
        <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
            <color attach="background" args={['#050505']} />

            {/* Lighting */}
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#0ff" />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#f0f" />

            <MovingStars />
            <GridFloor />

            {/* Lanes (Visual Only) */}
            <group position={[0, -2, 0]}>
                {[ -1.5, -0.5, 0.5, 1.5 ].map((x, i) => (
                    <mesh key={i} position={[x, 0, -10]} rotation={[-Math.PI / 2, 0, 0]}>
                        <boxGeometry args={[0.05, 40, 0.05]} />
                        <meshStandardMaterial color="#333" emissive="#111" />
                    </mesh>
                ))}
            </group>

            {/* Hit Line (Target) */}
            <mesh position={[0, -2, 0]}>
                <boxGeometry args={[4, 0.05, 0.05]} />
                <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
            </mesh>

            {/* Notes */}
            {notes.map(note => (
                <Note
                    key={note.id}
                    position={[
                        (note.lane * 1) - 1.5, // Map lane 0-3 to x coords (centered around 0)
                        -2, // Base Y (ground level)
                        note.z // Use Z for depth instead of Y for height
                    ]}
                    color={note.hit ? "#0f0" : "#ff00ff"}
                />
            ))}

            {/* Post Processing */}
            <EffectComposer disableNormalPass>
                <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} opacity={1.5} />
                <Noise opacity={0.05} />
            </EffectComposer>

            {/* Fog for depth */}
            <fog attach="fog" args={['#050505', 5, 20]} />
        </Canvas>
    );
}
