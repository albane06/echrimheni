import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { BuyerScreen } from './src/screens/BuyerScreen';
import { ExpertScreen } from './src/screens/ExpertScreen';

export default function App() {
  const [role, setRole] = useState<'BUYER' | 'EXPERT'>('BUYER');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      
      {/* Top Role Switcher */}
      <View style={styles.topBar}>
        <View style={styles.roleToggle}>
          <TouchableOpacity 
            style={[styles.toggleBtn, role === 'BUYER' && styles.toggleBtnActive]}
            onPress={() => setRole('BUYER')}
          >
            <Text style={[styles.toggleText, role === 'BUYER' && styles.toggleTextActive]}>
              Acheteur
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, role === 'EXPERT' && styles.toggleBtnActive]}
            onPress={() => setRole('EXPERT')}
          >
            <Text style={[styles.toggleText, role === 'EXPERT' && styles.toggleTextActive]}>
              Expert Terrain
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen View */}
      <View style={styles.content}>
        {role === 'BUYER' ? <BuyerScreen /> : <ExpertScreen />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  topBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b', backgroundColor: '#0f172a' },
  roleToggle: { flexDirection: 'row', backgroundColor: '#020617', borderRadius: 8, padding: 3, borderWidth: 1, borderColor: '#334155' },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: '#059669' },
  toggleText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  toggleTextActive: { color: '#ffffff' },
  content: { flex: 1 }
});