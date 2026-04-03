/**
 * AudioEngine.js - Web Audio API Synthesizer for the Bobcoin Rhythm Game
 * 
 * Generates cyberpunk-themed sound effects using oscillators and filters.
 * No audio files needed — pure mathematical waveform synthesis!
 */

let audioCtx = null;
let analyzer = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyzer = audioCtx.createAnalyser();
        analyzer.fftSize = 64; // Low FFT size for a "blocky" cyberpunk look
        analyzer.connect(audioCtx.destination);
    }
    // Resume if suspended (browser autoplay policy)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

export function getAnalyzer() {
    getAudioContext();
    return analyzer;
}

// Cyberpunk note frequencies (pentatonic scale in A minor)
const NOTE_FREQS = [
    220.00,  // A3
    261.63,  // C4
    329.63,  // E4
    392.00,  // G4
    440.00,  // A4
    523.25,  // C5
    659.25,  // E5
    783.99,  // G5
];

/**
 * Play a note hit sound — bright synth blip
 * @param {number} lane - Lane index (0-3), determines pitch
 * @param {string} quality - 'PERFECT', 'GOOD', or 'MISS'
 */
export function playHitSound(lane = 0, quality = 'GOOD') {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (quality === 'MISS') {
        playMissSound();
        return;
    }

    // Create oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Pitch based on lane
    const baseFreq = NOTE_FREQS[lane + (quality === 'PERFECT' ? 4 : 0)];
    osc.type = quality === 'PERFECT' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);

    // Filter sweep for that cyberpunk feel
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(quality === 'PERFECT' ? 4000 : 2000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.3);
    filter.Q.setValueAtTime(5, now);

    // Volume envelope: sharp attack, quick decay
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(quality === 'PERFECT' ? 0.4 : 0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    // Connect: osc -> filter -> gain -> analyzer -> output
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(analyzer); // Pipe through analyzer!

    osc.start(now);
    osc.stop(now + 0.3);
}

/**
 * Play a miss sound — dissonant buzz
 */
export function playMissSound() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(analyzer); // Pipe through analyzer!

    osc.start(now);
    osc.stop(now + 0.2);
}

/**
 * Play a match found / connection chime
 */
export function playMatchSound() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 arpeggio
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        
        gain.gain.setValueAtTime(0, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.3, now + i * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
        
        osc.connect(gain);
        gain.connect(analyzer); // Pipe through analyzer!
        
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.5);
    });
}

/**
 * Play a game start countdown beep
 */
export function playCountdownBeep(final = false) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(final ? 880 : 440, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(analyzer); // Pipe through analyzer!

    osc.start(now);
    osc.stop(now + 0.15);
}

/**
 * Play a "block confirmed" notification ping
 */
export function playBlockConfirmedSound() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1318.51, now); // E6
    osc.frequency.exponentialRampToValueAtTime(2637.02, now + 0.08); // E7

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(analyzer); // Pipe through analyzer!

    osc.start(now);
    osc.stop(now + 0.25);
}

/**
 * Background ambient drone (cyberpunk atmosphere)
 * Returns a stop function to kill the drone.
 */
export function startAmbientDrone() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Sub bass
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(55, now); // A1
    gain1.gain.setValueAtTime(0.06, now);

    // Detuned pad
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(110.5, now); // Slightly detuned A2
    gain2.gain.setValueAtTime(0.03, now);

    // LFO for wobble
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.5, now);
    lfoGain.gain.setValueAtTime(3, now);

    lfo.connect(lfoGain);
    lfoGain.connect(osc2.frequency);

    osc1.connect(gain1);
    gain1.connect(analyzer); // Pipe through analyzer!
    osc2.connect(gain2);
    gain2.connect(analyzer); // Pipe through analyzer!

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);

    return () => {
        const fadeTime = ctx.currentTime;
        gain1.gain.exponentialRampToValueAtTime(0.001, fadeTime + 1);
        gain2.gain.exponentialRampToValueAtTime(0.001, fadeTime + 1);
        setTimeout(() => {
            try { osc1.stop(); osc2.stop(); lfo.stop(); } catch(e) {}
        }, 1200);
    };
}
