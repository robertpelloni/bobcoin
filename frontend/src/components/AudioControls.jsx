import { useState, useEffect } from 'react';
import { synth } from '../utils/synth';
import './AudioControls.css';

export function AudioControls() {
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(0.3); // Match synth default

    useEffect(() => {
        const savedMute = localStorage.getItem('bobcoin_muted') === 'true';
        const savedVol = parseFloat(localStorage.getItem('bobcoin_volume'));

        if (savedMute) {
            synth.toggleMute();
            setIsMuted(true);
        }
        if (!isNaN(savedVol)) {
            synth.setVolume(savedVol);
            setVolume(savedVol);
        }
    }, []);

    const handleMuteToggle = () => {
        const muted = synth.toggleMute();
        setIsMuted(muted);
        localStorage.setItem('bobcoin_muted', muted);
    };

    const handleVolumeChange = (e) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        synth.setVolume(val);
        localStorage.setItem('bobcoin_volume', val);
        if (isMuted) {
            handleMuteToggle(); // Unmute if they start dragging volume
        }
    };

    return (
        <div className="audio-controls">
            <button className="mute-btn" onClick={handleMuteToggle} title={isMuted ? "Unmute Audio" : "Mute Audio"}>
                {isMuted ? '🔇' : '🔊'}
            </button>
            <input
                type="range"
                className="vol-slider"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                title="Master Volume"
            />
        </div>
    );
}
