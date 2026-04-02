import { useState, useEffect, useRef, Suspense } from 'react';
import { Scene } from './game/Scene';
import { ErrorBoundary } from 'react-error-boundary';
import { synth } from '../utils/synth';
import './RhythmGame.css';

const LANES = ['D', 'F', 'J', 'K'];
const SPEED = 0.15;
const SPAWN_INTERVAL = 800;
const SPAWN_Z = -20;
const HIT_ZONE_Z = 0;
const HIT_TOLERANCE = 1.5;

export function RhythmGame({ onScoreUpdate }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isAutoPlay, setIsAutoPlay] = useState(false);
    const [notes, setNotes] = useState([]);
    const [feedback, setFeedback] = useState(null);
    const [activeTheme, setActiveTheme] = useState('theme_neon'); // Default

    // Check local storage for equipped theme
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('marketplace_items'));
        if (saved) {
            const equippedTheme = saved.find(i => i.type === 'THEME' && i.purchased);
            if (equippedTheme) {
                setActiveTheme(equippedTheme.id);
            }
        }
    }, []);

    const requestRef = useRef();
    const lastSpawnTime = useRef(0);
    const notesRef = useRef([]);

    useEffect(() => {
        notesRef.current = notes;
    }, [notes]);

    const startGame = () => {
        setIsPlaying(true);
        setIsAutoPlay(false);
        synth.init();
    };

    const startAutoPlay = () => {
        setIsPlaying(true);
        setIsAutoPlay(true);
        synth.init();
    };

    const spawnNote = (time) => {
        if (time - lastSpawnTime.current > SPAWN_INTERVAL) {
            const lane = Math.floor(Math.random() * 4);
            const newNote = { id: Date.now() + Math.random(), lane, z: SPAWN_Z, hit: false };
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
            const nextZ = note.z + SPEED;

            if (isAutoPlay && !note.hit && Math.abs(nextZ - HIT_ZONE_Z) < 0.2) {
                synth.playHit();
                note.hit = true;
                stateChanged = true;
                return;
            }

            if (nextZ > 2) {
                if (!note.hit && !isAutoPlay) {
                    onScoreUpdate(-10);
                    synth.playMiss();
                }
                stateChanged = true;
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
            if (!isPlaying || isAutoPlay) return;
            const key = e.key.toUpperCase();
            const laneIndex = LANES.indexOf(key);
            if (laneIndex === -1) return;

            const currentNotes = notesRef.current;

            const hitIndex = currentNotes.findIndex(n =>
                n.lane === laneIndex && Math.abs(n.z - HIT_ZONE_Z) < HIT_TOLERANCE
            );

            if (hitIndex !== -1) {
                const note = currentNotes[hitIndex];
                const diff = Math.abs(note.z - HIT_ZONE_Z);

                let score = 0;
                let text = '';

                if (diff < 0.5) {
                    score = 100;
                    text = 'PERFECT';
                    synth.playHit();
                } else {
                    score = 50;
                    text = 'GOOD';
                    synth.playHit();
                }

                setFeedback(text);
                setTimeout(() => setFeedback(null), 300);
                onScoreUpdate(score);

                const newNotes = [...currentNotes];
                newNotes.splice(hitIndex, 1);
                setNotes(newNotes);
                notesRef.current = newNotes;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, onScoreUpdate, isAutoPlay]);

    function ErrorFallback({error}) {
        console.error(error);
        return (
            <div className="error-fallback" style={{color: 'red', textAlign: 'center', paddingTop: '2rem'}}>
                <p>WebGL Error.</p>
            </div>
        )
    }

    return (
        <div className="rhythm-game-container">
            <div className="canvas-wrapper">
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                    <Suspense fallback={<div style={{color:'#0ff'}}>LOADING 3D...</div>}>
                        <Scene notes={notes} activeTheme={activeTheme} />
                    </Suspense>
                </ErrorBoundary>
            </div>

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
                        <h2>PROOF OF PLAY v2.4</h2>
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
