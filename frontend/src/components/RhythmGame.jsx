import { useState, useEffect, useRef } from 'react';
import SimplePeer from 'simple-peer';
import { SIGNALING_URL } from '../api';
import { playHitSound, playMatchSound, startAmbientDrone, getAnalyzer } from '../audio/AudioEngine';
import { checkAndUnlock } from '../AchievementService';
import './RhythmGame.css';

const LANES = ['D', 'F', 'J', 'K'];
const SPEED = 5; // pixels per frame
const SPAWN_INTERVAL = 1000; // ms
const HIT_ZONE_Y = 400; // Top of hit zone
const HIT_ZONE_HEIGHT = 40; // Height of hit zone

export function RhythmGame({ onScoreUpdate, onLogEvent }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [notes, setNotes] = useState([]);
    const [feedback, setFeedback] = useState(null); // 'PERFECT', 'GOOD', 'MISS'
    
    // WebRTC Matchmaking State
    const [matchStatus, setMatchStatus] = useState('DISCONNECTED'); // DISCONNECTED, SEARCHING, CONNECTED
    const [opponentScore, setOpponentScore] = useState(0);
    const peerRef = useRef(null);
    const wsRef = useRef(null);
    const canvasRef = useRef(null);

    // Use refs for values needed inside the animation loop to avoid stale closures
    const requestRef = useRef();
    const lastSpawnTime = useRef(0);
    const notesRef = useRef([]); // Mirror state for the loop
    const scoreRef = useRef(0); // To broadcast live score

    // Keep ref in sync
    useEffect(() => {
        notesRef.current = notes;
    }, [notes]);

    const drawVisualizer = () => {
        const analyzer = getAnalyzer();
        if (!analyzer || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyzer.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            const blue = 255;
            const green = dataArray[i];
            const red = 255 - dataArray[i];

            ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }
    };

    const initMatchmaking = () => {
        setMatchStatus('SEARCHING');
        const wsUrl = SIGNALING_URL.replace('http', 'ws');
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('[WebRTC] Connected to signaling server');
            ws.send(JSON.stringify({ type: 'FIND_MATCH' }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'MATCH_FOUND') {
                console.log(`[WebRTC] Match found! Initiator: ${data.initiator}`);
                setMatchStatus('CONNECTING');
                
                // Initialize WebRTC peer
                const peer = new SimplePeer({
                    initiator: data.initiator,
                    trickle: false
                });

                peer.on('signal', (signal) => {
                    // Send WebRTC offer/answer back to signaling server
                    ws.send(JSON.stringify({ type: 'SIGNAL', signal }));
                });

                peer.on('connect', () => {
                    console.log('[WebRTC] P2P DIRECT CONNECTION ESTABLISHED!');
                    setMatchStatus('IN_GAME');
                    setIsPlaying(true);
                    playMatchSound();
                    
                    // Retrieve keypair from localStorage to unlock achievement
                    try {
                        const stored = localStorage.getItem('bobcoin_wallet');
                        if (stored) {
                            const kp = JSON.parse(stored);
                            checkAndUnlock('P2P_WARRIOR', kp, []);
                        }
                    } catch(e) {}
                });

                peer.on('data', (data) => {
                    // Received data directly from opponent (Decentralized!)
                    try {
                        const msg = JSON.parse(data.toString());
                        if (msg.type === 'SCORE_UPDATE') {
                            setOpponentScore(msg.score);
                        }
                    } catch(e) {}
                });

                peer.on('close', () => {
                    console.log('[WebRTC] Opponent Disconnected');
                    setMatchStatus('DISCONNECTED');
                    setIsPlaying(false);
                    peer.destroy();
                });

                peerRef.current = peer;
            } else if (data.type === 'SIGNAL') {
                // Receive WebRTC offer/answer from signaling server
                if (peerRef.current) {
                    peerRef.current.signal(data.signal);
                }
            } else if (data.type === 'OPPONENT_DISCONNECTED') {
                setMatchStatus('DISCONNECTED');
                if (peerRef.current) peerRef.current.destroy();
            }
        };

        ws.onclose = () => {
            setMatchStatus('DISCONNECTED');
        };
    };

    const broadcastScore = (newScore) => {
        if (peerRef.current && peerRef.current.connected) {
            peerRef.current.send(JSON.stringify({ type: 'SCORE_UPDATE', score: newScore }));
        }
    };

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
        drawVisualizer();

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
    const droneStopRef = useRef(null);
    useEffect(() => {
        if (isPlaying) {
            requestRef.current = requestAnimationFrame(updateGame);
            droneStopRef.current = startAmbientDrone();
        } else {
            cancelAnimationFrame(requestRef.current);
            if (droneStopRef.current) { droneStopRef.current(); droneStopRef.current = null; }
        }
        return () => {
            cancelAnimationFrame(requestRef.current);
            if (droneStopRef.current) { droneStopRef.current(); droneStopRef.current = null; }
        };
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
                playHitSound(note.lane, text);
                
                scoreRef.current += score;
                onScoreUpdate(score);
                broadcastScore(scoreRef.current);
                
                if (onLogEvent) onLogEvent({ time: Date.now(), key, diff, result: text });

                // Remove note
                const newNotes = [...currentNotes];
                newNotes.splice(hitIndex, 1);
                setNotes(newNotes);
                notesRef.current = newNotes;
            } else {
                setFeedback('MISS');
                setTimeout(() => setFeedback(null), 300);
                playHitSound(0, 'MISS');
                
                scoreRef.current -= 10;
                onScoreUpdate(-10);
                broadcastScore(scoreRef.current);
                
                if (onLogEvent) onLogEvent({ time: Date.now(), key, diff: null, result: 'MISS' });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, onScoreUpdate]);

    return (
        <div className="rhythm-game-container">
            <canvas 
                ref={canvasRef} 
                width="400" 
                height="100" 
                style={{position: 'absolute', top: '10px', left: 0, width: '100%', height: '100px', opacity: 0.5, pointerEvents: 'none'}}
            />
            <div className="matchmaking-panel" style={{position: 'absolute', top: '-60px', left: 0, width: '100%', display: 'flex', justifyContent: 'space-between', color: '#0ff', fontFamily: 'monospace', zIndex: 10}}>
                {matchStatus !== 'IN_GAME' ? (
                    <button className="cyber-button small" onClick={initMatchmaking} disabled={matchStatus === 'SEARCHING' || matchStatus === 'CONNECTING'}>
                        {matchStatus === 'DISCONNECTED' ? 'FIND MATCH (P2P)' : matchStatus === 'SEARCHING' ? 'SEARCHING FOR PEER...' : 'CONNECTING...'}
                    </button>
                ) : (
                    <div style={{background: '#000', border: '1px solid #f0f', padding: '0.5rem', color: '#f0f'}}>
                        OPPONENT SCORE: {opponentScore}
                    </div>
                )}
            </div>

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
