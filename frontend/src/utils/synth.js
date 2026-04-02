
class SynthEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3; // Low volume to prevent clipping
            this.masterGain.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playNote(freq = 440, type = 'sine', duration = 0.1) {
        if (!this.ctx) this.init();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playHit() {
        // Cyberpunk "Pluck" sound
        this.playNote(440 + Math.random() * 200, 'sawtooth', 0.2);
        this.playNote(880, 'square', 0.1);
    }

    playMiss() {
        // Glitchy noise
        this.playNote(100, 'sawtooth', 0.1);
        this.playNote(50, 'square', 0.3);
    }

    playAmbience() {
        // Low drone
        if (!this.ctx) this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(55, this.ctx.currentTime);
        gain.gain.value = 0.05;
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        return { stop: () => osc.stop() };
    }
}

export const synth = new SynthEngine();
