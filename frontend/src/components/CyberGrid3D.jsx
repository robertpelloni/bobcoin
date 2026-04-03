import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// An individual Block Lattice Node (Sphere) that pulses
function LatticeNode({ position, color }) {
    const mesh = useRef();
    
    useFrame((state) => {
        mesh.current.scale.x = 1 + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.1;
        mesh.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.1;
        mesh.current.scale.z = 1 + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.1;
    });

    return (
        <Sphere ref={mesh} args={[0.15, 16, 16]} position={position}>
            <meshBasicMaterial color={color} wireframe={true} />
        </Sphere>
    );
}

// The network of nodes and lines
function NetworkGrid() {
    const group = useRef();
    
    // Rotate the entire lattice slowly
    useFrame((state) => {
        group.current.rotation.y = state.clock.elapsedTime * 0.2;
        group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    });

    const nodes = [];
    const lines = [];

    // Generate a random spherical/lattice layout
    for (let i = 0; i < 20; i++) {
        const phi = Math.acos(-1 + (2 * i) / 20);
        const theta = Math.sqrt(20 * Math.PI) * phi;

        const radius = 2.5;
        const x = radius * Math.cos(theta) * Math.sin(phi);
        const y = radius * Math.sin(theta) * Math.sin(phi);
        const z = radius * Math.cos(phi);
        
        nodes.push([x, y, z]);
    }

    // Connect nodes to simulate DAG/Lattice connections
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const dist = new THREE.Vector3(...nodes[i]).distanceTo(new THREE.Vector3(...nodes[j]));
            if (dist < 2.0) {
                lines.push([nodes[i], nodes[j]]);
            }
        }
    }

    return (
        <group ref={group}>
            {nodes.map((pos, idx) => (
                <LatticeNode key={`node-${idx}`} position={pos} color={idx % 3 === 0 ? '#ff0055' : '#0ff'} />
            ))}
            {lines.map((pts, idx) => (
                <Line 
                    key={`line-${idx}`} 
                    points={pts} 
                    color="#00ffff" 
                    lineWidth={1} 
                    transparent 
                    opacity={0.3} 
                />
            ))}
        </group>
    );
}

export function CyberGrid3D() {
    const isMobile = window.innerWidth < 768;

    return (
        <div style={{ position: 'relative', width: '100%', height: isMobile ? '200px' : '400px', marginBottom: '2rem', border: '1px solid #333', background: 'radial-gradient(circle at center, #111 0%, #000 100%)' }}>
            <Canvas camera={{ position: [0, 0, 6], fov: isMobile ? 80 : 60 }}>
                <ambientLight intensity={0.5} />
                <NetworkGrid />
            </Canvas>
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', color: '#0ff', fontFamily: 'monospace', fontSize: '0.8rem', pointerEvents: 'none' }}>
                <span className="glitch" data-text="LATTICE TOPOLOGY RENDER_0X">LATTICE TOPOLOGY RENDER_0X</span>
            </div>
        </div>
    );
}