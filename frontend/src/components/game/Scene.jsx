import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Note } from './Note';

export function Scene({ notes }) {
    return (
        <Canvas camera={{ position: [0, 2, 5], fov: 60 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />

            {/* Lanes */}
            {[ -1.5, -0.5, 0.5, 1.5 ].map((x, i) => (
                <mesh key={i} position={[x, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[1, 10]} />
                    <meshBasicMaterial color="#111" wireframe />
                </mesh>
            ))}

            {/* Hit Line */}
            <mesh position={[0, -2, 0.1]}>
                <planeGeometry args={[4, 0.1]} />
                <meshBasicMaterial color="#fff" />
            </mesh>

            {/* Notes */}
            {notes.map(note => (
                <Note
                    key={note.id}
                    position={[
                        (note.lane * 1) - 1.5, // Map lane 0-3 to x coords
                        note.y, // Current Y (3D Space: Starts high, goes to -2)
                        0.5
                    ]}
                    color="#ff00ff"
                />
            ))}

            {/* Post Processing */}
            <EffectComposer>
                <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} />
            </EffectComposer>
        </Canvas>
    );
}
