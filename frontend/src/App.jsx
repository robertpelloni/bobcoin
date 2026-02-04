import { useState, useEffect } from 'react'
import './App.css'
import { submitProof } from './api'

function App() {
    const [score, setScore] = useState(0)
    const [combo, setCombo] = useState(0)
    const [mintStatus, setMintStatus] = useState(null) // null, 'minting', 'success', 'error'
    const [txSignature, setTxSignature] = useState('')
    const [lastTxId, setLastTxId] = useState('')

    // Cyberpunk effect: Glitch text on hit
    const [glitch, setGlitch] = useState(false)

    const handleHit = () => {
        // Basic clicker mechanic for now
        const points = 100 + (combo * 10)
        setScore(s => s + points)
        setCombo(c => c + 1)
        setGlitch(true)
        setTimeout(() => setGlitch(false), 100)
    }

    const handleMiss = () => {
        setCombo(0)
    }

    const handleMint = async () => {
        if (score < 1000) {
            alert("Score must be over 1000 to mint!")
            return
        }

        setMintStatus('minting')
        try {
            const result = await submitProof(score, 50, 10) // Mock stats derived from score
            if (result.success) {
                setMintStatus('success')
                setTxSignature(result.tx)
                setLastTxId(result.tx.substring(0, 8) + '...')
            } else {
                setMintStatus('error')
                alert(result.error || 'Minting failed')
            }
        } catch (e) {
            setMintStatus('error')
            console.error(e)
        }
    }

    return (
        <div className="game-container">
            <div className="ui-layer">
                <h1 className={glitch ? 'glitch' : ''} data-text="BOBCOIN">BOBCOIN</h1>
                <div className="stats-box">
                    <p>SCORE: <span className="neon-text">{score}</span></p>
                    <p>COMBO: <span className="neon-text-blue">x{combo}</span></p>
                </div>

                <div className="play-area" onClick={handleMiss}>
                    <button className="hit-button" onClick={(e) => { e.stopPropagation(); handleHit() }}>
                        HIT ME
                    </button>
                </div>

                <div className="controls">
                    <button className="cyber-button" onClick={handleMint} disabled={mintStatus === 'minting'}>
                        {mintStatus === 'minting' ? 'MINTING...' : 'MINT TOKENS'}
                    </button>
                </div>

                {mintStatus === 'success' && (
                    <div className="modal success">
                        <h2>MINT SUCCESSFUL</h2>
                        <p>Tokens minted to wallet.</p>
                        <p className="tx-id">TX: {txSignature}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default App
