import { submitLatticeBlock, getLatticeFrontier, getSporaProof } from './api';
import { Block } from './Block';
import { playBlockConfirmedSound } from './audio/AudioEngine';

export const ACHIEVEMENTS = {
    GIBSON_HACKER: { id: 'GIBSON_HACKER', title: 'Hacked the Gibson', desc: 'Generated entropy via keyboard smashing.', icon: '⌨️', color: '#0ff' },
    SPORA_LORD: { id: 'SPORA_LORD', title: 'SPoRA Lord', desc: 'Stored decentralized data to secure the lattice.', icon: '💾', color: '#0f0' },
    QUADRATIC_CITIZEN: { id: 'QUADRATIC_CITIZEN', title: 'Quadratic Citizen', desc: 'Cast a vote in the Lattice DAO.', icon: '⚖️', color: '#ff0' },
    FHE_PHANTOM: { id: 'FHE_PHANTOM', title: 'FHE Phantom', desc: 'Completed a blind-multiplied game round.', icon: '👻', color: '#f0f' },
    LATTICE_SHARK: { id: 'LATTICE_SHARK', title: 'Lattice Shark', desc: 'Won a bet at the Autonomous Casino.', icon: '🎰', color: '#ff0055' },
    P2P_WARRIOR: { id: 'P2P_WARRIOR', title: 'WebRTC Warrior', desc: 'Completed a direct P2P multiplayer match.', icon: '⚔️', color: '#f80' },
    LATTICE_VALIDATOR: { id: 'LATTICE_VALIDATOR', title: 'Lattice Validator', desc: 'Staked tokens to secure the sovereign network.', icon: '🥩', color: '#0f0' },
    CRYPTOGRAPHER: { id: 'CRYPTOGRAPHER', title: 'Master Cryptographer', desc: 'Secured the sovereign identity via mnemonic backup.', icon: '🔐', color: '#ff0055' },
    DATA_ARCHITECT: { id: 'DATA_ARCHITECT', title: 'Data Architect', desc: 'Anchored permanent data to the Block Lattice.', icon: '📦', color: '#0ff' },
};

export async function checkAndUnlock(achievementId, keypair, existingChain = []) {
    // 1. Check if already unlocked on-chain
    const alreadyUnlocked = existingChain.some(b => b.type === 'achievement_unlock' && b.payload?.id === achievementId);
    if (alreadyUnlocked) return false;

    console.log(`[Achievement Engine] UNLOCKING: ${achievementId}`);

    try {
        // 2. Fetch current chain state
        const frontierData = await getLatticeFrontier(keypair.publicKey);
        const previous = frontierData.frontier || null;
        const balance = 0; // Achievement blocks are metadata-only (0 balance change)
        
        // Use current balance if available
        const currentBalance = existingChain.length > 0 ? existingChain[existingChain.length-1].balance : 0;

        // 3. Create achievement_unlock block
        const block = new Block({
            type: 'achievement_unlock',
            account: keypair.publicKey,
            previous: previous,
            balance: currentBalance,
            link: 'SYSTEM_ACHIEVEMENT',
            payload: ACHIEVEMENTS[achievementId]
        });

        // 4. Sign and broadcast
        block.sign(keypair.privateKey);
        const result = await submitLatticeBlock(block);
        
        if (result.success) {
            playBlockConfirmedSound();
            return true;
        }
    } catch (e) {
        console.error(`[Achievement Engine] Failed to unlock ${achievementId}`, e);
    }
    return false;
}
