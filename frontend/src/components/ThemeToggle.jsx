import { useState, useEffect } from 'react';
import './ThemeToggle.css';

export function ThemeToggle() {
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        const saved = localStorage.getItem('bobcoin_theme') || 'dark';
        setTheme(saved);
        document.body.className = saved === 'light' ? 'light-mode' : '';
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('bobcoin_theme', newTheme);
        document.body.className = newTheme === 'light' ? 'light-mode' : '';
    };

    return (
        <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
            {theme === 'dark' ? '☀️' : '🌙'}
        </button>
    );
}
