import { useState, useEffect, useRef, Suspense } from 'react';
import { Scene } from './game/Scene';
import { ErrorBoundary } from 'react-error-boundary';
import './RhythmGame.css';

const LANES = ['D', 'F', 'J', 'K'];
const SPEED = 0.1; // 3D units per frame
const SPAWN_INTERVAL = 1000; // ms
const HIT_ZONE_Y = -2; // 3D Y coord for hit line
const HIT_TOLERANCE = 0.5; // +/- units

export function RhythmGame({ onScoreUpdate }) {
    const [isPlaying, setIsPlaying] = useState(false);
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

    const spawnNote = (time) => {
        if (time - lastSpawnTime.current > SPAWN_INTERVAL) {
            const lane = Math.floor(Math.random() * 4);
            const newNote = {
                id: Date.now() + Math.random(),
                lane,
                y: 5, // Start high in 3D space
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
            // Move note down in 3D space
            const nextY = note.y - SPEED; // Moving down is negative Y

            // Miss logic (below -3)
            if (nextY < -3) {
                stateChanged = true;
                // Missed
            } else {
                if (nextY !== note.y) stateChanged = true;
                nextNotes.push({ ...note, y: nextY });
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
            if (!isPlaying) return;
            const key = e.key.toUpperCase();
            const laneIndex = LANES.indexOf(key);
            if (laneIndex === -1) return;

            const currentNotes = notesRef.current;

            // Find note in lane near hit zone
            const hitIndex = currentNotes.findIndex(n =>
                n.lane === laneIndex &&
                Math.abs(n.y - HIT_ZONE_Y) < HIT_TOLERANCE
            );

            if (hitIndex !== -1) {
                const note = currentNotes[hitIndex];
                const diff = Math.abs(note.y - HIT_ZONE_Y);

                let score = 0;
                let text = '';

                if (diff < 0.2) {
                    score = 100;
                    text = 'PERFECT';
                } else {
                    score = 50;
                    text = 'GOOD';
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
    }, [isPlaying, onScoreUpdate]);

    function ErrorFallback({error}) {
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

                {!isPlaying && (
                    <div className="game-overlay">
                        <h2>PROOF OF PLAY (WebGL)</h2>
                        <p>Press D, F, J, K to match notes.</p>
                        <button className="cyber-button" onClick={() => setIsPlaying(true)}>
                            START MINING
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
