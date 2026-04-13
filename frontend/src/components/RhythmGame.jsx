<<<<<<< HEAD
import { useState, useEffect, useRef } from 'react';
import SimplePeer from 'simple-peer';
import { SIGNALING_URL } from '../api';
import { playHitSound, playMatchSound, startAmbientDrone, getAnalyzer } from '../audio/AudioEngine';
import { checkAndUnlock } from '../AchievementService';
=======
import { useState, useEffect, useRef, Suspense } from 'react';
import { Scene } from './game/Scene';
import { ErrorBoundary } from 'react-error-boundary';
import { synth } from '../utils/synth'; // Import Audio Engine
>>>>>>> feature/comprehensive-ui-spec
import './RhythmGame.css';

const LANES = ['D', 'F', 'J', 'K'];
const SPEED = 0.15; // 3D units per frame (Z-axis)
const SPAWN_INTERVAL = 800; // ms
const SPAWN_Z = -20; // Start far away
const HIT_ZONE_Z = 0; // Target line at Z=0
const HIT_TOLERANCE = 1.5; // +/- units (Perspective makes this tricky, need lenient zone)

export function RhythmGame({ onScoreUpdate, onLogEvent }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isAutoPlay, setIsAutoPlay] = useState(false);
    const [notes, setNotes] = useState([]);
<<<<<<< HEAD
    const [feedback, setFeedback] = useState(null); // 'PERFECT', 'GOOD', 'MISS'
    
    // WebRTC Matchmaking State
    const [matchStatus, setMatchStatus] = useState('DISCONNECTED'); // DISCONNECTED, SEARCHING, CONNECTED
    const [opponentScore, setOpponentScore] = useState(0);
    const peerRef = useRef(null);
    const wsRef = useRef(null);
    const canvasRef = useRef(null);
=======
    const [feedback, setFeedback] = useState(null);
>>>>>>> feature/comprehensive-ui-spec

    // Game Loop Refs
    const requestRef = useRef();
    const lastSpawnTime = useRef(0);
<<<<<<< HEAD
    const notesRef = useRef([]); // Mirror state for the loop
    const scoreRef = useRef(0); // To broadcast live score
=======
    const notesRef = useRef([]);
>>>>>>> feature/comprehensive-ui-spec

    // Keep ref in sync
    useEffect(() => {
        notesRef.current = notes;
    }, [notes]);

<<<<<<< HEAD
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

        ws.onopen = async () => {
            console.log('[WebRTC] Connected to signaling server');
            let publicKey = '';
            try {
                const stored = localStorage.getItem('bobcoin_wallet');
                if (stored) {
                    const kp = JSON.parse(stored);
                    const { deriveKeypair } = await import('../cryptoUtils');
                    const realKp = await deriveKeypair(kp.mnemonic, 0);
                    publicKey = realKp.publicKey;
                }
            } catch (e) {}

            ws.send(JSON.stringify({ type: 'FIND_MATCH', publicKey }));
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
=======
    const startGame = () => {
        setIsPlaying(true);
        setIsAutoPlay(false);
        synth.init(); // Initialize Audio Context
    };

    const startAutoPlay = () => {
        setIsPlaying(true);
        setIsAutoPlay(true);
        synth.init();
>>>>>>> feature/comprehensive-ui-spec
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
        drawVisualizer();

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

<<<<<<< HEAD
    // Start/Stop Loop
    const droneStopRef = useRef(null);
=======
>>>>>>> feature/comprehensive-ui-spec
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
                playHitSound(note.lane, text);
                
                scoreRef.current += score;
                onScoreUpdate(score);
                broadcastScore(scoreRef.current);
                
                if (onLogEvent) onLogEvent({ time: Date.now(), key, diff, result: text });

                // Mark visually as hit or remove immediately?
                // Let's remove for cleaner gameplay
                const newNotes = [...currentNotes];
                newNotes.splice(hitIndex, 1);
                setNotes(newNotes);
                notesRef.current = newNotes;
            } else {
<<<<<<< HEAD
                setFeedback('MISS');
                setTimeout(() => setFeedback(null), 300);
                playHitSound(0, 'MISS');
                
                scoreRef.current -= 10;
                onScoreUpdate(-10);
                broadcastScore(scoreRef.current);
                
                if (onLogEvent) onLogEvent({ time: Date.now(), key, diff: null, result: 'MISS' });
=======
                // Misfire (optional penalty)
                // onScoreUpdate(-5);
>>>>>>> feature/comprehensive-ui-spec
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
<<<<<<< HEAD
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
=======
            {/* 3D Scene */}
            <div className="canvas-wrapper">
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                    <Suspense fallback={<div style={{color:'#0ff'}}>LOADING 3D...</div>}>
                        <Scene notes={notes} />
                    </Suspense>
                </ErrorBoundary>
>>>>>>> feature/comprehensive-ui-spec
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
