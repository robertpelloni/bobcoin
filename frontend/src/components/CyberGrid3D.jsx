import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, Sphere, Text } from '@react-three/drei';
import { LATTICE_URL } from '../api';
import { useNetwork } from '../NetworkContext';
import * as THREE from 'three';

// An individual Block Lattice Node (Sphere) that pulses
function LatticeNode({ position, color, label, isLocal }) {
    const mesh = useRef();
    
    useFrame((state) => {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.1;
        mesh.current.scale.set(scale, scale, scale);
    });

    return (
        <group position={position}>
            <Sphere ref={mesh} args={[isLocal ? 0.25 : 0.15, 16, 16]}>
                <meshBasicMaterial color={color} wireframe={true} />
            </Sphere>
            <Text
                position={[0, 0.4, 0]}
                fontSize={0.15}
                color={color}
                font="/fonts/Inter-Bold.woff" // Fallback to system
            >
                {label}
            </Text>
        </group>
    );
}

// The dynamic P2P Mesh
function NetworkMesh() {
    const group = useRef();
    const { lastBlock } = useNetwork();
    const [nodes, setNodes] = useState([]);
    const [lines, setLines] = useState([]);
    const [activeBeams, setActiveBeams] = useState([]);

    useEffect(() => {
        if (lastBlock && lastBlock.type === 'send') {
            // Find sender and receiver nodes
            // For now, simulate beam from local to random peer or vice versa
            const beam = {
                id: Math.random(),
                start: [0, 0, 0],
                end: [ (Math.random()-0.5)*6, (Math.random()-0.5)*2, (Math.random()-0.5)*6 ],
                timestamp: Date.now()
            };
            setActiveBeams(prev => [...prev.slice(-10), beam]);
        }
    }, [lastBlock]);

    useEffect(() => {
        const fetchNetwork = async () => {
            try {
                const res = await fetch(`${LATTICE_URL}/peers`);
                const peerData = await res.json();
                const peerList = Object.keys(peerData);

                const newNodes = [];
                // Local Node at center
                newNodes.push({ pos: [0, 0, 0], color: '#0f0', label: 'LOCAL_NODE', isLocal: true });

                // Map peers in a circle/sphere around local node
                peerList.forEach((url, i) => {
                    const angle = (i / peerList.length) * Math.PI * 2;
                    const radius = 3;
                    const x = Math.cos(angle) * radius;
                    const z = Math.sin(angle) * radius;
                    const y = (Math.random() - 0.5) * 2;
                    newNodes.push({ pos: [x, y, z], color: '#0ff', label: url.split(':')[2] || 'PEER', isLocal: false });
                });

                // Generate connections
                const newLines = [];
                for(let i = 1; i < newNodes.length; i++) {
                    newLines.push([newNodes[0].pos, newNodes[i].pos]);
                }

                setNodes(newNodes);
                setLines(newLines);
            } catch (e) {}
        };

        fetchNetwork();
        const interval = setInterval(fetchNetwork, 10000);
        return () => clearInterval(interval);
    }, []);
    
    useFrame((state) => {
        group.current.rotation.y = state.clock.elapsedTime * 0.15;
    });

    return (
        <group ref={group}>
            {nodes.map((n, idx) => (
                <LatticeNode key={idx} position={n.pos} color={n.color} label={n.label} isLocal={n.isLocal} />
            ))}
            {lines.map((pts, idx) => (
                <Line 
                    key={`l-${idx}`} 
                    points={pts} 
                    color="#00ffff" 
                    lineWidth={1} 
                    transparent 
                    opacity={0.1} 
                />
            ))}
            {activeBeams.map((beam) => (
                <TransactionBeam key={beam.id} start={beam.start} end={beam.end} />
            ))}
        </group>
    );
}

function TransactionBeam({ start, end }) {
    const lineRef = useRef();
    const [opacity, setOpacity] = useState(1);

    useFrame(() => {
        if (opacity > 0) setOpacity(o => Math.max(0, o - 0.02));
    });

    if (opacity <= 0) return null;

    return (
        <Line 
            points={[start, end]} 
            color="#ff0055" 
            lineWidth={3} 
            transparent 
            opacity={opacity} 
        />
    );
}

export function CyberGrid3D() {
    const isMobile = window.innerWidth < 768;

    return (
        <div style={{ position: 'relative', width: '100%', height: isMobile ? '200px' : '400px', marginBottom: '2rem', border: '1px solid #333', background: 'radial-gradient(circle at center, #111 0%, #000 100%)' }}>
            <Canvas camera={{ position: [0, 0, 8], fov: isMobile ? 80 : 50 }}>
                <ambientLight intensity={0.5} />
                <NetworkMesh />
            </Canvas>
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', color: '#0ff', fontFamily: 'monospace', fontSize: '0.8rem', pointerEvents: 'none' }}>
                <span className="glitch" data-text="CONSENSUS MATRIX v7.2.0">CONSENSUS MATRIX v7.2.0</span>
            </div>
        </div>
    );
}