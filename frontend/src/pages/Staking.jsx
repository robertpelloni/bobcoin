import { useState, useEffect } from 'react';
import { submitLatticeBlock, getLatticeFrontier, getLatticeChain } from '../api';
import { checkAndUnlock } from '../AchievementService';
import { Block } from '../Block';
import { AccountSelector } from '../components/AccountSelector';
import { SignConfirmModal } from '../components/SignConfirmModal';
import { deriveKeypair } from '../cryptoUtils';
import './Staking.css';

export function Staking() {
    const [balance, setBalance] = useState(0);
    const [stakedBalance, setStakedBalance] = useState(0);
    const [amount, setAmount] = useState(10);
    const [keypair, setKeypair] = useState(null);
    const [pendingBlock, setPendingBlock] = useState(null);
    const [onGuardianConfirm, setOnGuardianConfirm] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const storedKeys = localStorage.getItem('lattice_arcade_wallet');
        if (storedKeys) {
            const kp = JSON.parse(storedKeys);
            setKeypair(kp);
            fetchData(kp.publicKey);
        }
    }, []);

    const handleAccountChange = async (index) => {
        const stored = localStorage.getItem('lattice_arcade_wallet');
        if (!stored) return;
        const master = JSON.parse(stored);
        const newKp = await deriveKeypair(master.mnemonic, index);
        setKeypair(newKp);
        fetchData(newKp.publicKey);
        checkAndUnlock('LATTICE_TREASURER', newKp, []);
    };

    const fetchData = async (pubkey) => {
        const res = await getLatticeFrontier(pubkey);
        setBalance(res.balance || 0);
        setStakedBalance(res.staked_balance || 0);
    };

    const handleStake = async () => {
        if (balance < amount) return alert("Insufficient liquid balance");
        setLoading(true);
        try {
            const frontier = await getLatticeFrontier(keypair.publicKey);
            
            const block = new Block({
                type: 'stake_lock',
                account: keypair.publicKey,
                previous: frontier.frontier,
                balance: balance - amount,
                staked_balance: stakedBalance + amount,
                link: 'STAKE_LOCK',
                height: frontier.frontier ? (frontier.height + 1) : 0
            });

            await block.signBlock(keypair.privateKey);
            
            // Trigger Guardian Review
            setPendingBlock(block);
            setOnGuardianConfirm(() => async () => {
                const res = await submitLatticeBlock(block);
                if (res.success) {
                    alert("Tokens Staked! Your voting power and yield have increased.");
                    fetchData(keypair.publicKey);
                    checkAndUnlock('LATTICE_VALIDATOR', keypair, []);
                    checkAndUnlock('LATTICE_SENTINEL', keypair, []);
                } else {
                    alert("Stake failed: " + res.error);
                }
                setPendingBlock(null);
            });
        } catch (e) {
            alert(e.message);
        }
        setLoading(false);
    };

    const handleUnstake = async () => {
        if (stakedBalance < amount) return alert("Insufficient staked balance");
        setLoading(true);
        try {
            const frontier = await getLatticeFrontier(keypair.publicKey);
            
            const block = new Block({
                type: 'stake_unlock',
                account: keypair.publicKey,
                previous: frontier.frontier,
                balance: balance + amount,
                staked_balance: stakedBalance - amount,
                link: 'STAKE_UNLOCK',
                height: frontier.frontier ? (frontier.height + 1) : 0
            });

            await block.signBlock(keypair.privateKey);
            
            // Trigger Guardian Review
            setPendingBlock(block);
            setOnGuardianConfirm(() => async () => {
                const res = await submitLatticeBlock(block);
                if (res.success) {
                    alert("Tokens Unstaked! Funds are now liquid.");
                    fetchData(keypair.publicKey);
                    checkAndUnlock('LATTICE_SENTINEL', keypair, []);
                } else {
                    alert("Unstake failed: " + res.error);
                }
                setPendingBlock(null);
            });
        } catch (e) {
            alert(e.message);
        }
        setLoading(false);
    };

    return (
        <div className="staking-container">
            <h1 className="glitch" data-text="LATTICE STAKING">LATTICE STAKING</h1>
            <p className="subtitle">SECURE THE NETWORK & EARN PROTOCOL YIELD</p>

            <div className="staking-grid">
                <AccountSelector currentAccount={keypair} onAccountChange={handleAccountChange} />
                <div className="stat-panel liquid">
                    <span className="label">LIQUID BALANCE</span>
                    <span className="value">{balance.toFixed(4)} BOB</span>
                    <p className="desc">Subject to 0.01%/min Demurrage</p>
                </div>
                <div className="stat-panel staked">
                    <span className="label">STAKED BALANCE</span>
                    <span className="value">{stakedBalance.toFixed(4)} BOB</span>
                    <p className="desc">2x Voting Power + Yield Enabled</p>
                </div>
            </div>

            <div className="action-box">
                <input 
                    type="number" 
                    className="cyber-input" 
                    value={amount} 
                    onChange={e => setAmount(Number(e.target.value))} 
                    title="Amount of BOB tokens to stake or unstake."
                />
                <div className="button-group">
                    <button className="cyber-button" onClick={handleStake} disabled={loading || balance < amount} title="Lock BOB to secure the network, earn yield, and double your voting power.">STAKE</button>
                    <button className="cyber-button secondary" onClick={handleUnstake} disabled={loading || stakedBalance < amount} title="Unlock BOB from staking, making it liquid and spendable again.">UNSTAKE</button>
                </div>
            </div>

            <div className="yield-estimate">
                <h3>ESTIMATED ANNUAL YIELD</h3>
                <div className="yield-value">12.5% APY</div>
                <p>Rewards are distributed via network minting events and transaction fees.</p>
            </div>

            <SignConfirmModal 
                block={pendingBlock} 
                onConfirm={onGuardianConfirm} 
                onCancel={() => setPendingBlock(null)} 
            />
        </div>
    );
}
