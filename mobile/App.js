import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001'; // In emulator, use 10.0.2.2 or tunnel

export default function App() {
  const [mining, setMining] = useState(false);
  const [balance, setBalance] = useState(0.0000);
  const [globalBankroll, setGlobalBankroll] = useState(0);
  const [logs, setLogs] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch Global Stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Fetch Bankroll
        const bRes = await fetch(`${API_URL}/bankroll`);
        if (bRes.ok) {
            const bData = await bRes.json();
            setGlobalBankroll(bData.balance);
        }

        // Fetch Leaderboard
        const lRes = await fetch(`${API_URL}/leaderboard`);
        if (lRes.ok) {
            const lData = await lRes.json();
            setLeaderboard(lData.leaderboard || []);
        }
      } catch (e) {
        setLogs(l => [`[ERROR] Connection Failed: ${e.message}`, ...l].slice(0, 5));
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Mining Loop
  useEffect(() => {
    let interval;
    if (mining) {
      interval = setInterval(async () => {
        // Simulate local mining + network ping
        try {
            // In a real app, this would submit a PoW hash
            // const res = await fetch(`${API_URL}/mobile/ping`, { method: 'POST' });

            setBalance(b => b + 0.0001);
            setLogs(l => [`[MINING] Block #${Math.floor(Math.random() * 9999)} verified.`, ...l].slice(0, 8));
        } catch (e) {
            setLogs(l => [`[ERROR] Network unreachable.`, ...l].slice(0, 8));
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [mining]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BOBCOIN</Text>
        <Text style={styles.subtitle}>MOBILE LIGHT NODE v1.0</Text>
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* Wallet Card */}
        <View style={styles.card}>
            <Text style={styles.label}>LOCAL BALANCE</Text>
            <Text style={styles.value}>{balance.toFixed(4)} <Text style={styles.currency}>BOB</Text></Text>
        </View>

        {/* Global Stats */}
        <View style={styles.row}>
            <View style={[styles.card, {flex: 1, marginRight: 10}]}>
                <Text style={styles.label}>GLOBAL BANKROLL</Text>
                <Text style={styles.statValue}>{globalBankroll.toFixed(2)}</Text>
            </View>
            <View style={[styles.card, {flex: 1}]}>
                <Text style={styles.label}>NETWORK STATUS</Text>
                <Text style={[styles.statValue, {color: '#0f0'}]}>ONLINE</Text>
            </View>
        </View>

        {/* Mining Control */}
        <TouchableOpacity
            style={[styles.button, mining ? styles.buttonActive : null]}
            onPress={() => setMining(!mining)}
        >
            <Text style={styles.buttonText}>
            {mining ? 'STOP MINING' : 'START MINING'}
            </Text>
            {mining && <ActivityIndicator color="#0ff" style={{marginLeft: 10}} />}
        </TouchableOpacity>

        {/* Console Logs */}
        <View style={styles.logContainer}>
            <Text style={styles.label}>SYSTEM LOGS</Text>
            {logs.map((log, i) => (
            <Text key={i} style={styles.logText}>{log}</Text>
            ))}
            {logs.length === 0 && <Text style={{color:'#555'}}>Ready to initialize...</Text>}
        </View>

        {/* Leaderboard Teaser */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>TOP MINERS</Text>
            {leaderboard.length > 0 ? (
                leaderboard.slice(0, 3).map((p, i) => (
                    <View key={i} style={styles.leaderRow}>
                        <Text style={styles.leaderRank}>#{i+1}</Text>
                        <Text style={styles.leaderName}>{p.player.substring(0, 10)}...</Text>
                        <Text style={styles.leaderScore}>{p.score}</Text>
                    </View>
                ))
            ) : (
                <Text style={{color: '#555', fontStyle: 'italic'}}>Fetching network data...</Text>
            )}
        </View>
      </ScrollView>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    paddingTop: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  title: {
    color: '#0ff',
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 4,
    textShadowColor: '#0ff',
    textShadowRadius: 10,
  },
  subtitle: {
    color: '#ff00ff',
    fontSize: 14,
    letterSpacing: 2,
  },
  card: {
    backgroundColor: 'rgba(20, 20, 30, 0.6)',
    borderColor: '#333',
    borderWidth: 1,
    padding: 15,
    marginBottom: 15,
    borderRadius: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  label: {
    color: '#888',
    fontSize: 10,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  value: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  currency: {
    fontSize: 14,
    color: '#0ff',
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 18,
    borderColor: '#0ff',
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  buttonActive: {
    backgroundColor: 'rgba(0, 255, 255, 0.15)',
    borderColor: '#0f0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  logContainer: {
    height: 150,
    backgroundColor: '#000',
    borderColor: '#333',
    borderWidth: 1,
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
  },
  logText: {
    color: '#0f0',
    fontFamily: 'monospace',
    fontSize: 11,
    marginBottom: 3,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 5,
    marginBottom: 10,
  },
  leaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  leaderRank: {
    color: '#ff00ff',
    width: 30,
    fontWeight: 'bold',
  },
  leaderName: {
    color: '#ccc',
    flex: 1,
  },
  leaderScore: {
    color: '#0ff',
    fontWeight: 'bold',
  }
});
