import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import './Trollbox.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function Trollbox() {
    const wallet = useWallet();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const scrollRef = useRef(null);

    const fetchMessages = async () => {
        try {
            const res = await fetch(`${API_URL}/chat`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages);
            }
        } catch (e) {
            // silent fail
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const user = wallet.publicKey ? wallet.publicKey.toBase58() : 'Anon_' + Math.floor(Math.random() * 1000);

        try {
            await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user, text: input })
            });
            setInput('');
            fetchMessages();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="trollbox-container">
            <div className="trollbox-header">
                <h3>TROLLBOX</h3>
                <span className="online-indicator">● {Math.floor(Math.random() * 50) + 100} ONLINE</span>
            </div>

            <div className="messages-list" ref={scrollRef}>
                {messages.map(msg => (
                    <div key={msg.id} className="message-item">
                        <span className="timestamp">[{msg.timestamp}]</span>
                        <span className="username" title={msg.user}>{msg.user.slice(0, 6)}...</span>:
                        <span className="text"> {msg.text}</span>
                    </div>
                ))}
                {messages.length === 0 && <div className="empty-msg">No messages yet. Say hi!</div>}
            </div>

            <form onSubmit={handleSend} className="chat-input">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={wallet.connected ? "Type message..." : "Connect wallet to chat"}
                    // disabled={!wallet.connected} // Allow anon for demo fun
                />
                <button type="submit">SEND</button>
            </form>
        </div>
    );
}
