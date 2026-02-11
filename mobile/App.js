import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';

export default function App() {
  const [mining, setMining] = useState(false);
  const [balance, setBalance] = useState(0.0000);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    let interval;
    if (mining) {
      interval = setInterval(() => {
        setBalance(b => b + 0.0001);
        setLogs(l => [`Seeding block #${Math.floor(Math.random() * 1000)}...`, ...l].slice(0, 5));
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [mining]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BOBCOIN</Text>
      <Text style={styles.subtitle}>MOBILE LIGHT NODE</Text>

      <View style={styles.card}>
        <Text style={styles.label}>WALLET BALANCE</Text>
        <Text style={styles.value}>{balance.toFixed(4)} BOB</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, mining ? styles.buttonActive : null]}
        onPress={() => setMining(!mining)}
      >
        <Text style={styles.buttonText}>
          {mining ? 'MINING ACTIVE' : 'START MINING'}
        </Text>
      </TouchableOpacity>

      <View style={styles.logContainer}>
        <Text style={styles.label}>NODE LOGS</Text>
        {logs.map((log, i) => (
          <Text key={i} style={styles.logText}>{log}</Text>
        ))}
      </View>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color: '#0ff',
    fontSize: 40,
    fontWeight: 'bold',
    letterSpacing: 5,
    marginBottom: 10,
    textShadowColor: '#0ff',
    textShadowRadius: 10,
  },
  subtitle: {
    color: '#ff00ff',
    fontSize: 16,
    letterSpacing: 2,
    marginBottom: 50,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(20, 20, 30, 0.8)',
    borderColor: '#333',
    borderWidth: 1,
    padding: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  label: {
    color: '#888',
    fontSize: 12,
    marginBottom: 5,
  },
  value: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  button: {
    width: '100%',
    padding: 20,
    borderColor: '#0ff',
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: 30,
  },
  buttonActive: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    borderColor: '#0f0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  logContainer: {
    width: '100%',
    height: 150,
    backgroundColor: '#000',
    borderColor: '#333',
    borderWidth: 1,
    padding: 10,
  },
  logText: {
    color: '#0f0',
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 5,
  }
});
