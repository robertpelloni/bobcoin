export const burnTokens = async (amount, reason) => {
    console.log(`[API Mock] Burning ${amount} BOB for: ${reason}`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return { success: true, tx: 'tx_' + Math.random().toString(36).substr(2, 9) };
};

export const mintTokens = async (amount, reason) => {
    console.log(`[API Mock] Minting ${amount} BOB for: ${reason}`);
    await new Promise(resolve => setTimeout(resolve, 800));
    return { success: true, tx: 'tx_' + Math.random().toString(36).substr(2, 9) };
};
