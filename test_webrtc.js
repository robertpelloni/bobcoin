/**
 * test_webrtc.js - WebRTC Matchmaking Signaling Server Integration Test
 * 
 * Tests the WebSocket signaling infrastructure for P2P WebRTC matchmaking.
 * Spins up a temporary signaling server on port 19999 using the same logic
 * as the Game Server, then runs two simulated players through the full
 * matchmaking + SDP relay + disconnect flow.
 */

import { WebSocketServer } from 'ws';
import http from 'http';
import WebSocket from 'ws';

const TEST_PORT = 19999;

// ---- Embedded Signaling Server (identical logic to game-server/server.js) ----
function startSignalingServer() {
    const httpServer = http.createServer();
    const wss = new WebSocketServer({ server: httpServer });
    let waitingPlayer = null;

    wss.on('connection', (ws) => {
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                
                if (data.type === 'FIND_MATCH') {
                    if (waitingPlayer && waitingPlayer !== ws && waitingPlayer.readyState === 1) {
                        waitingPlayer.send(JSON.stringify({ type: 'MATCH_FOUND', initiator: true }));
                        waitingPlayer.opponent = ws;
                        ws.send(JSON.stringify({ type: 'MATCH_FOUND', initiator: false }));
                        ws.opponent = waitingPlayer;
                        waitingPlayer = null;
                    } else {
                        waitingPlayer = ws;
                    }
                } else if (data.type === 'SIGNAL') {
                    if (ws.opponent && ws.opponent.readyState === 1) {
                        ws.opponent.send(JSON.stringify({ type: 'SIGNAL', signal: data.signal }));
                    }
                }
            } catch (e) {}
        });

        ws.on('close', () => {
            if (waitingPlayer === ws) waitingPlayer = null;
            if (ws.opponent) {
                try { ws.opponent.send(JSON.stringify({ type: 'OPPONENT_DISCONNECTED' })); } catch(e){}
                ws.opponent.opponent = null;
            }
        });
    });

    return new Promise((resolve) => {
        httpServer.listen(TEST_PORT, () => resolve({ httpServer, wss }));
    });
}

// ---- Test Helpers ----
function createPlayer(name) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
        const player = { name, ws, messages: [] };
        
        ws.on('open', () => resolve(player));
        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            player.messages.push(msg);
        });
        ws.on('error', reject);
        setTimeout(() => reject(new Error(`${name} connection timeout`)), 5000);
    });
}

function waitForMessage(player, type, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const existing = player.messages.find(m => m.type === type);
        if (existing) return resolve(existing);
        
        const interval = setInterval(() => {
            const msg = player.messages.find(m => m.type === type);
            if (msg) {
                clearInterval(interval);
                clearTimeout(timer);
                resolve(msg);
            }
        }, 50);
        
        const timer = setTimeout(() => {
            clearInterval(interval);
            reject(new Error(`[${player.name}] Timeout waiting for ${type}`));
        }, timeout);
    });
}

// ---- Main Test ----
async function main() {
    console.log('=== WEBRTC MATCHMAKING SIGNALING TEST ===\n');
    
    // Start embedded signaling server
    const { httpServer } = await startSignalingServer();
    console.log(`Signaling server started on port ${TEST_PORT}\n`);
    
    // Step 1: Connect two players
    console.log('1. Connecting two players to signaling server...');
    const alice = await createPlayer('Alice');
    const bob = await createPlayer('Bob');
    console.log('✅ Both players connected!\n');
    
    // Step 2: Alice requests a match (enters queue)
    console.log('2. Alice requests FIND_MATCH (enters waiting queue)...');
    alice.ws.send(JSON.stringify({ type: 'FIND_MATCH' }));
    await new Promise(r => setTimeout(r, 200));
    console.log('✅ Alice is waiting for an opponent.\n');
    
    // Step 3: Bob requests a match (triggers matchmaking)
    console.log('3. Bob requests FIND_MATCH (triggers match with Alice)...');
    bob.ws.send(JSON.stringify({ type: 'FIND_MATCH' }));
    
    // Step 4: Both should receive MATCH_FOUND
    console.log('4. Waiting for MATCH_FOUND signals...');
    const aliceMatch = await waitForMessage(alice, 'MATCH_FOUND');
    const bobMatch = await waitForMessage(bob, 'MATCH_FOUND');
    
    console.log(`   Alice: initiator=${aliceMatch.initiator}`);
    console.log(`   Bob: initiator=${bobMatch.initiator}`);
    
    if (aliceMatch.initiator === true && bobMatch.initiator === false) {
        console.log('✅ Correct! Alice is initiator, Bob is receiver.\n');
    } else {
        throw new Error('❌ FAILED: Invalid initiator assignment!');
    }
    
    // Step 5: SDP Offer relay (Alice -> Server -> Bob)
    console.log('5. Alice sends mock SDP offer via signaling server...');
    const mockOffer = { type: 'offer', sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\ns=bobcoin-rhythm-battle' };
    alice.ws.send(JSON.stringify({ type: 'SIGNAL', signal: mockOffer }));
    
    const bobSignal = await waitForMessage(bob, 'SIGNAL');
    if (bobSignal.signal.sdp === mockOffer.sdp) {
        console.log('✅ SDP offer relayed correctly from Alice to Bob!\n');
    } else {
        throw new Error('❌ FAILED: SDP relay mismatch!');
    }
    
    // Step 6: SDP Answer relay (Bob -> Server -> Alice)
    console.log('6. Bob sends mock SDP answer via signaling server...');
    const mockAnswer = { type: 'answer', sdp: 'v=0\r\no=- 654321 2 IN IP4 127.0.0.1\r\ns=bobcoin-rhythm-accept' };
    bob.ws.send(JSON.stringify({ type: 'SIGNAL', signal: mockAnswer }));
    
    const aliceSignal = await waitForMessage(alice, 'SIGNAL');
    if (aliceSignal.signal.sdp === mockAnswer.sdp) {
        console.log('✅ SDP answer relayed correctly from Bob to Alice!\n');
    } else {
        throw new Error('❌ FAILED: SDP relay mismatch!');
    }
    
    // Step 7: ICE candidate relay
    console.log('7. Testing ICE candidate relay...');
    const iceCandidate = { candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 12345 typ host', sdpMid: '0' };
    alice.ws.send(JSON.stringify({ type: 'SIGNAL', signal: iceCandidate }));
    
    // Clear Bob's old SIGNAL message
    bob.messages = bob.messages.filter(m => m !== bobSignal);
    const bobIce = await waitForMessage(bob, 'SIGNAL');
    if (bobIce.signal.candidate === iceCandidate.candidate) {
        console.log('✅ ICE candidate relayed correctly!\n');
    } else {
        throw new Error('❌ FAILED: ICE candidate relay mismatch!');
    }
    
    // Step 8: Disconnect notification
    console.log('8. Testing opponent disconnect notification...');
    bob.ws.close();
    
    const disconnectMsg = await waitForMessage(alice, 'OPPONENT_DISCONNECTED');
    console.log('✅ Alice received OPPONENT_DISCONNECTED notification!\n');
    
    // Step 9: Test a third player entering after disconnect
    console.log('9. Testing new player enters queue after disconnect...');
    const charlie = await createPlayer('Charlie');
    charlie.ws.send(JSON.stringify({ type: 'FIND_MATCH' }));
    await new Promise(r => setTimeout(r, 200));
    
    // Alice re-queues
    alice.messages = [];
    alice.ws.send(JSON.stringify({ type: 'FIND_MATCH' }));
    
    const charlieMatch = await waitForMessage(charlie, 'MATCH_FOUND');
    const aliceRematch = await waitForMessage(alice, 'MATCH_FOUND');
    console.log(`   Charlie: initiator=${charlieMatch.initiator}, Alice: initiator=${aliceRematch.initiator}`);
    console.log('✅ Re-queue and rematch works correctly!\n');
    
    // Cleanup
    alice.ws.close();
    charlie.ws.close();
    httpServer.close();
    
    console.log('=== ALL 9 WEBRTC SIGNALING TESTS PASSED ===');
}

main().catch((err) => {
    console.error('❌ TEST FAILED:', err.message);
    process.exit(1);
});
