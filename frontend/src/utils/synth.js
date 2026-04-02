
class SynthEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isMuted = false;
        this.volume = 0.3; // Default volume
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
            this.masterGain.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        if (this.masterGain && !this.isMuted) {
            this.masterGain.gain.value = this.volume;
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
        }
        return this.isMuted;
    }

    getMuteStatus() {
        return this.isMuted;
    }

    getVolume() {
        return this.volume;
    }

    playNote(freq = 440, type = 'sine', duration = 0.1) {
        if (!this.ctx) this.init();
        if (this.isMuted) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        // Use a relative gain so we don't blow out the master volume
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playHit() {
        if (this.isMuted) return;
        // Cyberpunk "Pluck" sound
        this.playNote(440 + Math.random() * 200, 'sawtooth', 0.2);
        this.playNote(880, 'square', 0.1);
    }

    playMiss() {
        if (this.isMuted) return;
        // Glitchy noise
        this.playNote(100, 'sawtooth', 0.1);
        this.playNote(50, 'square', 0.3);
    }

    playAmbience() {
        if (this.isMuted) return { stop: () => {} };
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
        return { stop: () => { try { osc.stop(); } catch(e){} } };
    }
}

export const synth = new SynthEngine();
