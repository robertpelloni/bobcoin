
import { useEffect, useRef } from 'react';
import { synth } from '../utils/synth';

export function useSoundEffects() {
    useEffect(() => {
        // Global event listener for buttons
        const handleMouseEnter = (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.classList.contains('nav-link')) {
                // High pitch blip
                synth.playNote(880, 'sine', 0.05);
            }
        };

        const handleClick = (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.classList.contains('nav-link')) {
                // Low pitch click
                synth.playNote(220, 'square', 0.1);
            }
        };

        document.addEventListener('mouseover', handleMouseEnter);
        document.addEventListener('click', handleClick);

        return () => {
            document.removeEventListener('mouseover', handleMouseEnter);
            document.removeEventListener('click', handleClick);
        };
    }, []);
}
