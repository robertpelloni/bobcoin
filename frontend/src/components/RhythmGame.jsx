import { useState, useEffect, useRef } from 'react';
import './RhythmGame.css';

const LANES = ['D', 'F', 'J', 'K'];
const SPEED = 5; // pixels per frame
const SPAWN_INTERVAL = 1000; // ms
const HIT_ZONE_Y = 400; // Top of hit zone
const HIT_ZONE_HEIGHT = 40; // Height of hit zone

export function RhythmGame({ onScoreUpdate }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [notes, setNotes] = useState([]);
    const [feedback, setFeedback] = useState(null); // 'PERFECT', 'GOOD', 'MISS'

    // Use refs for values needed inside the animation loop to avoid stale closures
    const requestRef = useRef();
    const lastSpawnTime = useRef(0);
    const notesRef = useRef([]); // Mirror state for the loop

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
                y: -50,
                hit: false
            };
            // Update both state and ref
            const updatedNotes = [...notesRef.current, newNote];
            setNotes(updatedNotes);
            notesRef.current = updatedNotes;

            lastSpawnTime.current = time;
        }
    };

    const updateGame = (time) => {
        if (!isPlaying) return;

        spawnNote(time);

        // Move notes
        const currentNotes = notesRef.current;
        const nextNotes = [];
        let stateChanged = false;

        currentNotes.forEach(note => {
            const nextY = note.y + SPEED;

            // Miss logic: if past screen (500px)
            if (nextY > 550) {
                stateChanged = true;
                // Missed note, remove it
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

    // Start/Stop Loop
    useEffect(() => {
        if (isPlaying) {
            requestRef.current = requestAnimationFrame(updateGame);
        } else {
            cancelAnimationFrame(requestRef.current);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [isPlaying]);

    // Input Handling
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isPlaying) return;
            const key = e.key.toUpperCase();
            const laneIndex = LANES.indexOf(key);
            if (laneIndex === -1) return;

            // Check for hit in current notes
            const currentNotes = notesRef.current;
            const TARGET_Y = HIT_ZONE_Y + (HIT_ZONE_HEIGHT / 2); // 420

            // Find first note in lane near target
            const hitIndex = currentNotes.findIndex(n =>
                n.lane === laneIndex &&
                n.y > HIT_ZONE_Y - 20 && n.y < HIT_ZONE_Y + HIT_ZONE_HEIGHT + 20
            );

            if (hitIndex !== -1) {
                const note = currentNotes[hitIndex];
                const diff = Math.abs(note.y - TARGET_Y);

                let score = 0;
                let text = '';

                if (diff < 15) {
                    score = 100;
                    text = 'PERFECT';
                } else if (diff < 35) {
                    score = 50;
                    text = 'GOOD';
                } else {
                    score = 10;
                    text = 'OK';
                }

                setFeedback(text);
                setTimeout(() => setFeedback(null), 300);
                onScoreUpdate(score);

                // Remove note
                const newNotes = [...currentNotes];
                newNotes.splice(hitIndex, 1);
                setNotes(newNotes);
                notesRef.current = newNotes;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, onScoreUpdate]);

    return (
        <div className="rhythm-game-container">
            {LANES.map((k, i) => (
                <div key={i} className="game-lane" style={{left: `${i * 25}%`}}></div>
            ))}

            <div className="hit-zone" style={{top: `${HIT_ZONE_Y}px`, height: `${HIT_ZONE_HEIGHT}px`}}></div>

            <div className="key-labels">
                {LANES.map(k => <div key={k} className="key-label">{k}</div>)}
            </div>

            {notes.map(note => (
                <div
                    key={note.id}
                    className="note"
                    style={{
                        left: `${note.lane * 25}%`,
                        top: `${note.y}px`,
                        width: '25%'
                    }}
                />
            ))}

            {feedback && (
                <div className={`feedback-text feedback-${feedback.toLowerCase()}`}>
                    {feedback}
                </div>
            )}

            {!isPlaying && (
                <div className="game-overlay">
                    <h2>PROOF OF PLAY</h2>
                    <p>Press D, F, J, K to match notes.</p>
                    <button className="cyber-button" onClick={() => setIsPlaying(true)}>
                        START MINING
                    </button>
                </div>
            )}
        </div>
    );
}
