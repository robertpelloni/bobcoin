import { useEffect, useState } from 'react';

const KONAMI_CODE = [
    'ArrowUp', 'ArrowUp',
    'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight',
    'ArrowLeft', 'ArrowRight',
    'b', 'a'
];

export function useKonamiCode() {
    const [input, setInput] = useState([]);
    const [triggered, setTriggered] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            setInput(prev => {
                const updated = [...prev, e.key];
                if (updated.length > KONAMI_CODE.length) {
                    updated.shift();
                }

                if (updated.join('') === KONAMI_CODE.join('')) {
                    setTriggered(true);
                    return [];
                }
                return updated;
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return triggered;
}
