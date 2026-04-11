import React, { useState } from 'react';
import './Tooltip.css';

export function Tooltip({ text, children }) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            className="tooltip-container"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div className="tooltip-bubble">
                    {text}
                </div>
            )}
        </div>
    );
}
