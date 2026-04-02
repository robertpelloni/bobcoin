import { useState, useEffect, useRef, Suspense } from 'react';
import { Scene } from './game/Scene';
import { ErrorBoundary } from 'react-error-boundary';
import { synth } from '../utils/synth'; // Import Audio Engine
import './RhythmGame.css';

const LANES = ['D', 'F', 'J', 'K'];
const SPEED = 0.15; // 3D units per frame (Z-axis)
const SPAWN_INTERVAL = 800; // ms
const SPAWN_Z = -20; // Start far away
const HIT_ZONE_Z = 0; // Target line at Z=0
const HIT_TOLERANCE = 1.5; // +/- units (Perspective makes this tricky, need lenient zone)

export function RhythmGame({ onScoreUpdate }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isAutoPlay, setIsAutoPlay] = useState(false);
    const [notes, setNotes] = useState([]);
    const [feedback, setFeedback] = useState(null);

    // Game Loop Refs
    const requestRef = useRef();
    const lastSpawnTime = useRef(0);
    const notesRef = useRef([]);

    // Keep ref in sync
    useEffect(() => {
        notesRef.current = notes;
    }, [notes]);

    const startGame = () => {
        setIsPlaying(true);
        setIsAutoPlay(false);
        synth.init(); // Initialize Audio Context
    };

    const startAutoPlay = () => {
        setIsPlaying(true);
        setIsAutoPlay(true);
        synth.init();
    };

    const spawnNote = (time) => {
        if (time - lastSpawnTime.current > SPAWN_INTERVAL) {
            const lane = Math.floor(Math.random() * 4);
            const newNote = {
                id: Date.now() + Math.random(),
                lane,
                z: SPAWN_Z, // Start deep in screen
                hit: false
            };
            const updated = [...notesRef.current, newNote];
            setNotes(updated);
            notesRef.current = updated;
            lastSpawnTime.current = time;
        }
    };

    const updateGame = (time) => {
        if (!isPlaying) return;

        spawnNote(time);

        const currentNotes = notesRef.current;
        const nextNotes = [];
        let stateChanged = false;

        currentNotes.forEach(note => {
            // Move note forward (Positive Z)
            const nextZ = note.z + SPEED;

            // Auto Play Logic
            if (isAutoPlay && !note.hit && Math.abs(nextZ - HIT_ZONE_Z) < 0.2) {
                // Perfect hit
                synth.playHit();
                // setFeedback('AUTO'); // Optional
                // setTimeout(() => setFeedback(null), 100);
                note.hit = true;
                // Don't add to nextNotes (remove it)
                stateChanged = true;
                return;
            }

            // Miss logic (past camera > 2)
            if (nextZ > 2) {
                if (!note.hit && !isAutoPlay) {
                    onScoreUpdate(-10); // Penalty for miss
                    synth.playMiss();
                }
                stateChanged = true;
                // Remove note
            } else {
                if (nextZ !== note.z) stateChanged = true;
                nextNotes.push({ ...note, z: nextZ });
            }
        });

        if (stateChanged) {
            setNotes(nextNotes);
            notesRef.current = nextNotes;
        }

        requestRef.current = requestAnimationFrame(updateGame);
    };

    useEffect(() => {
        if (isPlaying) {
            requestRef.current = requestAnimationFrame(updateGame);
        } else {
            cancelAnimationFrame(requestRef.current);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [isPlaying]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isPlaying || isAutoPlay) return; // Disable input in AutoPlay
            const key = e.key.toUpperCase();
            const laneIndex = LANES.indexOf(key);
            if (laneIndex === -1) return;

            const currentNotes = notesRef.current;

            // Find note in lane near hit zone (Z=0)
            const hitIndex = currentNotes.findIndex(n =>
                n.lane === laneIndex &&
                Math.abs(n.z - HIT_ZONE_Z) < HIT_TOLERANCE
            );

            if (hitIndex !== -1) {
                const note = currentNotes[hitIndex];
                const diff = Math.abs(note.z - HIT_ZONE_Z);

                let score = 0;
                let text = '';

                if (diff < 0.5) {
                    score = 100;
                    text = 'PERFECT';
                    synth.playHit(); // Clear synth sound
                } else {
                    score = 50;
                    text = 'GOOD';
                    synth.playHit(); // Standard hit
                }

                setFeedback(text);
                setTimeout(() => setFeedback(null), 300);
                onScoreUpdate(score);

                // Mark visually as hit or remove immediately?
                // Let's remove for cleaner gameplay
                const newNotes = [...currentNotes];
                newNotes.splice(hitIndex, 1);
                setNotes(newNotes);
                notesRef.current = newNotes;
            } else {
                // Misfire (optional penalty)
                // onScoreUpdate(-5);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, onScoreUpdate, isAutoPlay]);

    function ErrorFallback({error}) {
        console.error(error);
        return (
            <div className="error-fallback" style={{color: 'red', textAlign: 'center', paddingTop: '2rem'}}>
                <p>WebGL Error. Switching to 2D Mode.</p>
                <div className="2d-lanes" style={{display: 'flex', height: '100%', position: 'absolute', top:0, left:0, width:'100%'}}>
                    {LANES.map(k => <div key={k} style={{flex: 1, borderRight: '1px solid #333'}}></div>)}
                </div>
            </div>
        )
    }

    return (
        <div className="rhythm-game-container">
            {/* 3D Scene */}
            <div className="canvas-wrapper">
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                    <Suspense fallback={<div style={{color:'#0ff'}}>LOADING 3D...</div>}>
                        <Scene notes={notes} />
                    </Suspense>
                </ErrorBoundary>
            </div>

            {/* UI Overlay */}
            <div className="ui-overlay">
                <div className="key-labels">
                    {LANES.map(k => <div key={k} className="key-label">{k}</div>)}
                </div>

                {feedback && (
                    <div className={`feedback-text feedback-${feedback.toLowerCase()}`}>
                        {feedback}
                    </div>
                )}

                {isAutoPlay && <div className="autoplay-indicator">VISUALIZER MODE</div>}

                {!isPlaying && (
                    <div className="game-overlay">
                        <h2>PROOF OF PLAY v2.1</h2>
                        <p>Press D, F, J, K to match notes.</p>
                        <div className="button-group">
                            <button className="cyber-button" onClick={startGame}>
                                START MINING
                            </button>
                            <button className="cyber-button secondary" onClick={startAutoPlay}>
                                AUTO / VISUALIZER
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
