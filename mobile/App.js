import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001'; // In emulator, use 10.0.2.2 or tunnel

// Components
const MiningScreen = ({ mining, setMining, balance, hashRate, logs, globalBankroll, leaderboard }) => {
    // Graph Logic embedded
    const [graphData, setGraphData] = useState(new Array(20).fill(10));

    useEffect(() => {
        if(mining && hashRate > 0) {
            setGraphData(prev => [...prev.slice(1), hashRate]);
        }
    }, [mining, hashRate]);

    const renderGraph = () => {
        if (!mining) return <Text style={{color: '#555', textAlign: 'center', marginTop: 20}}>MINING INACTIVE</Text>;
        const max = Math.max(...graphData, 150);
        const min = Math.min(...graphData, 0);
        return (
            <View style={styles.graphContainer}>
                {graphData.map((val, i) => {
                    const height = ((val - min) / (max - min)) * 50 + 10;
                    return <View key={i} style={[styles.bar, {height, backgroundColor: i === graphData.length-1 ? '#fff' : '#0ff'}]} />;
                })}
            </View>
        )
    };

    return (
        <ScrollView style={styles.scrollContent}>
            <View style={styles.card}>
                <Text style={styles.label}>LOCAL BALANCE</Text>
                <Text style={styles.value}>{balance.toFixed(4)} <Text style={styles.currency}>BOB</Text></Text>
                <Text style={styles.hashRate}>{mining ? `${hashRate} H/s` : 'IDLE'}</Text>
            </View>

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

            <TouchableOpacity
                style={[styles.button, mining ? styles.buttonActive : null]}
                onPress={() => setMining(!mining)}
            >
                <Text style={styles.buttonText}>{mining ? 'STOP MINING' : 'START MINING'}</Text>
                {mining && <ActivityIndicator color="#0ff" style={{marginLeft: 10}} />}
            </TouchableOpacity>

            <View style={styles.graphBox}>
                <Text style={styles.label}>HASHRATE MONITOR</Text>
                {renderGraph()}
            </View>

            <View style={styles.logContainer}>
                <Text style={styles.label}>SYSTEM LOGS</Text>
                {logs.map((log, i) => <Text key={i} style={styles.logText}>{log}</Text>)}
            </View>
        </ScrollView>
    );
};

const QuestsScreen = () => {
    const [quests, setQuests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/quests`)
            .then(res => res.json())
            .then(data => setQuests(data.quests || []))
            .catch(err => console.log(err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <ScrollView style={styles.scrollContent}>
            <Text style={styles.sectionTitle}>DAILY BOUNTIES</Text>
            {loading ? <Text style={{color:'#888'}}>Loading...</Text> : quests.map(q => (
                <View key={q.id} style={styles.card}>
                    <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                        <Text style={{color:'#fff', fontWeight:'bold'}}>{q.title}</Text>
                        <Text style={{color:'#0f0'}}>+{q.reward} BOB</Text>
                    </View>
                    <Text style={{color:'#888', fontSize:12, marginTop:5}}>Target: {q.target}</Text>
                    <TouchableOpacity style={[styles.button, {marginTop:10, padding:10, marginBottom:0}]}>
                        <Text style={[styles.buttonText, {fontSize:12}]}>CLAIM</Text>
                    </TouchableOpacity>
                </View>
            ))}
        </ScrollView>
    );
};

const WalletScreen = ({ balance }) => {
    return (
        <ScrollView style={styles.scrollContent}>
            <View style={styles.card}>
                <Text style={styles.label}>TOTAL ASSETS</Text>
                <Text style={styles.value}>{balance.toFixed(4)} <Text style={styles.currency}>BOB</Text></Text>
            </View>

            <View style={[styles.card, {alignItems:'center', padding:40}]}>
                <View style={{width:200, height:200, backgroundColor:'#fff', marginBottom:20}}></View>
                <Text style={{color:'#888', fontFamily:'monospace', textAlign:'center'}}>
                    0x71C7656EC7ab88b098defB751B7401B5f6d8976F
                </Text>
                <TouchableOpacity style={[styles.button, {marginTop:20, width:'100%', marginBottom:0}]}>
                    <Text style={styles.buttonText}>COPY ADDRESS</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

export default function App() {
  const [tab, setTab] = useState('MINING');
  const [mining, setMining] = useState(false);
  const [balance, setBalance] = useState(0.0000);
  const [hashRate, setHashRate] = useState(0);
  const [globalBankroll, setGlobalBankroll] = useState(0);
  const [logs, setLogs] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  // Fetch Global Stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const bRes = await fetch(`${API_URL}/bankroll`);
        if (bRes.ok) {
            const bData = await bRes.json();
            setGlobalBankroll(bData.balance);
        }
        const lRes = await fetch(`${API_URL}/leaderboard`);
        if (lRes.ok) {
            const lData = await lRes.json();
            setLeaderboard(lData.leaderboard || []);
        }
      } catch (e) {
        setLogs(l => [`[ERROR] Connection Failed`, ...l].slice(0, 5));
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
        try {
            const currentHash = Math.floor(Math.random() * 50) + 100;
            setHashRate(currentHash);
            setBalance(b => b + 0.0001);
            if (Math.random() > 0.7) {
                 setLogs(l => [`[MINING] Block verified (${currentHash} H/s)`, ...l].slice(0, 8));
            }
        } catch (e) {}
      }, 1000);
    } else {
        setHashRate(0);
    }
    return () => clearInterval(interval);
  }, [mining]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BOBCOIN</Text>
        <Text style={styles.subtitle}>MOBILE LIGHT NODE v2.0</Text>
      </View>

      <View style={styles.content}>
          {tab === 'MINING' && (
              <MiningScreen
                mining={mining} setMining={setMining}
                balance={balance} hashRate={hashRate}
                logs={logs} globalBankroll={globalBankroll}
              />
          )}
          {tab === 'QUESTS' && <QuestsScreen />}
          {tab === 'WALLET' && <WalletScreen balance={balance} />}
      </View>

      <View style={styles.tabBar}>
          {['MINING', 'QUESTS', 'WALLET'].map(t => (
              <TouchableOpacity key={t} style={[styles.tabItem, tab === t ? styles.tabActive : null]} onPress={() => setTab(t)}>
                  <Text style={[styles.tabText, tab === t ? styles.tabTextActive : null]}>{t}</Text>
              </TouchableOpacity>
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
    paddingTop: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 10,
  },
  content: {
      flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  tabBar: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: '#333',
      height: 60,
      backgroundColor: '#111',
  },
  tabItem: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  tabActive: {
      borderTopWidth: 2,
      borderTopColor: '#0ff',
      backgroundColor: '#1a1a1a',
  },
  tabText: {
      color: '#555',
      fontSize: 12,
      fontWeight: 'bold',
  },
  tabTextActive: {
      color: '#0ff',
  },
  title: {
    color: '#0ff',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 4,
    textShadowColor: '#0ff',
    textShadowRadius: 10,
  },
  subtitle: {
    color: '#ff00ff',
    fontSize: 12,
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
  hashRate: {
      color: '#0f0',
      fontSize: 14,
      fontFamily: 'monospace',
      marginTop: 5,
      textAlign: 'right'
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
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 5,
    marginBottom: 10,
    marginTop: 10,
  },
  graphBox: {
      height: 100,
      backgroundColor: '#111',
      borderColor: '#333',
      borderWidth: 1,
      marginBottom: 20,
      padding: 10,
      justifyContent: 'flex-end'
  },
  graphContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: 70
  },
  bar: {
      width: 8,
      backgroundColor: '#0ff',
      borderTopLeftRadius: 2,
      borderTopRightRadius: 2
  }
});
