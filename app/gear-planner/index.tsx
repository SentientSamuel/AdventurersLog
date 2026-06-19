import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Image, useWindowDimensions,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import { theme } from '../../constants/theme';
import { Loadout, emptyGear, defaultPlayerStats, CombatStyle } from '../../constants/equipment-slots';

const STORAGE_KEY = 'gear_planner_loadouts';

// PNG icons from assets/icons/ 
const STYLE_IMAGES: Record<CombatStyle, any> = {
  melee:  require('../../assets/icons/melee.png'),
  ranged: require('../../assets/icons/ranged.png'),
  magic:  require('../../assets/icons/magic.png'),
};
const COMBAT_ICON = require('../../assets/icons/combat-icon.png');

function StoneBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Image source={require('../../assets/icons/osrs-bg-scale.png')} style={{ width, height }} resizeMode="cover" />
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject as any}>
        <Defs>
          <RadialGradient id="vig3" cx="50%" cy="45%" r="70%">
            <Stop offset="0%"   stopColor="#0d0900" stopOpacity="0.0" />
            <Stop offset="75%"  stopColor="#0d0900" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0d0900" stopOpacity="0.92" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#vig3)" />
      </Svg>
    </View>
  );
}

async function loadLoadouts(): Promise<Loadout[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveLoadouts(loadouts: Loadout[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loadouts));
}

export default function GearPlannerScreen() {
  const router = useRouter();
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStyle, setNewStyle] = useState<CombatStyle>('melee');

  useEffect(() => {
    loadLoadouts().then((l) => { setLoadouts(l); setLoading(false); });
  }, []);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    const loadout: Loadout = {
      id: `${Date.now()}`,
      name: newName.trim(),
      combatStyle: newStyle,
      attackStyle: newStyle === 'melee' ? 'aggressive' : newStyle === 'ranged' ? 'rapid' : 'standard',
      gear: emptyGear(),
      prayers: [],
      playerStats: defaultPlayerStats(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [...loadouts, loadout];
    setLoadouts(updated);
    await saveLoadouts(updated);
    setShowCreate(false);
    setNewName('');
    router.push(`/gear-planner/${loadout.id}` as any);
  }, [newName, newStyle, loadouts]);

  const handleDelete = useCallback(async (id: string) => {
    const updated = loadouts.filter((l) => l.id !== id);
    setLoadouts(updated);
    await saveLoadouts(updated);
  }, [loadouts]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.gold} size="large" />
          <Text style={styles.loadingText}>Loading loadouts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Home</Text>
          </TouchableOpacity>
          <View style={styles.ornamentRow}>
            <View style={styles.ornamentLine} />
            <Text style={styles.ornamentSymbol}>✦</Text>
            <Text style={styles.ornamentLabel}>Old School RuneScape</Text>
            <Text style={styles.ornamentSymbol}>✦</Text>
            <View style={styles.ornamentLine} />
          </View>
          <Text style={styles.screenTitle}>Gear Planner</Text>
          <View style={styles.taglineRow}>
            <View style={styles.ornamentLine} />
            <Text style={styles.ornamentSymbol}>✦</Text>
            <Text style={styles.screenSubtitle}>Build & Compare Loadouts</Text>
            <Text style={styles.ornamentSymbol}>✦</Text>
            <View style={styles.ornamentLine} />
          </View>
        </View>

        <TouchableOpacity style={styles.createButton} onPress={() => setShowCreate(true)}>
          <Text style={styles.createButtonText}>+ New Loadout</Text>
        </TouchableOpacity>

        {loadouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Image source={COMBAT_ICON} style={styles.emptyStateIcon} resizeMode="contain" />
            <Text style={styles.emptyText}>No loadouts yet.</Text>
            <Text style={styles.emptySubtext}>Create your first loadout to start planning your gear.</Text>
          </View>
        ) : (
          <View style={styles.loadoutList}>
            {loadouts.map((loadout) => (
              <TouchableOpacity
                key={loadout.id}
                style={styles.loadoutCard}
                onPress={() => router.push(`/gear-planner/${loadout.id}` as any)}
              >
                <View style={styles.loadoutCardLeft}>
                  <Image source={STYLE_IMAGES[loadout.combatStyle]} style={styles.loadoutStyleIcon} resizeMode="contain" />
                  <View>
                    <Text style={styles.loadoutName}>{loadout.name}</Text>
                    <Text style={styles.loadoutMeta}>
                      {loadout.combatStyle.charAt(0).toUpperCase() + loadout.combatStyle.slice(1)} •{' '}
                      {Object.values(loadout.gear).filter(Boolean).length} items
                    </Text>
                  </View>
                </View>
                <View style={styles.loadoutCardRight}>
                  <Text style={styles.loadoutArrow}>›</Text>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(loadout.id)}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create Modal — KeyboardAvoidingView prevents keyboard covering the input */}
      <Modal visible={showCreate} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>New Loadout</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Vorkath, GWD, Slayer"
                placeholderTextColor={theme.colors.textMuted}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                returnKeyType="next"
              />
              <Text style={styles.modalLabel}>Combat Style</Text>
              <View style={styles.styleRow}>
                {(['melee', 'ranged', 'magic'] as CombatStyle[]).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.styleChip, newStyle === s && styles.styleChipActive]}
                    onPress={() => setNewStyle(s)}
                  >
                    <Image source={STYLE_IMAGES[s]} style={styles.styleChipIcon} resizeMode="contain" />
                    <Text style={[styles.styleChipText, newStyle === s && styles.styleChipTextActive]}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowCreate(false); setNewName(''); }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleCreate}>
                  <Text style={styles.primaryBtnText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.parchmentDim },
  header: { alignItems: 'center', paddingTop: 10, paddingBottom: 6, marginBottom: 16, gap: 8 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 4, paddingBottom: 10 },
  backButtonText: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.gold, letterSpacing: 0.5 },
  screenTitle: { fontFamily: theme.fonts.display, fontSize: 34, color: theme.colors.gold, letterSpacing: 1, textShadowColor: 'rgba(200,160,48,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12, includeFontPadding: false, lineHeight: 42 },
  screenSubtitle: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.parchmentDim, fontStyle: 'italic', letterSpacing: 1 },
  ornamentRow: { flexDirection: 'row', alignItems: 'center', width: '90%', gap: 6 },
  taglineRow: { flexDirection: 'row', alignItems: 'center', width: '90%', gap: 6 },
  ornamentLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  ornamentSymbol: { color: theme.colors.goldDim, fontSize: 10 },
  ornamentLabel: { fontFamily: theme.fonts.display, fontSize: 11, color: theme.colors.goldDim, letterSpacing: 3, textTransform: 'uppercase' },
  createButton: { backgroundColor: theme.colors.gold, borderRadius: 5, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  createButtonText: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.background, fontWeight: 'bold', letterSpacing: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyStateIcon: { width: 30, height: 30 },
  emptyText: { fontFamily: theme.fonts.display, fontSize: 30, color: theme.colors.parchmentDim },
  emptySubtext: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
  loadoutList: { gap: 10 },
  loadoutCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.panel, borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 4, padding: 14 },
  loadoutCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  loadoutStyleIcon: { width: 25, height: 25 },
  loadoutName: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.parchment, letterSpacing: 0.5 },
  loadoutMeta: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.textMuted, marginTop: 2 },
  loadoutCardRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loadoutArrow: { fontFamily: theme.fonts.display, fontSize: 28, color: theme.colors.gold },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.redLight },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { width: '100%', backgroundColor: theme.colors.panel, borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 4, padding: 20, gap: 12 },
  modalTitle: { fontFamily: theme.fonts.display, fontSize: 22, color: theme.colors.goldLight, letterSpacing: 1 },
  modalLabel: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.parchmentDark, letterSpacing: 1, textTransform: 'uppercase' },
  input: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 5, backgroundColor: theme.colors.background, paddingHorizontal: 12, paddingVertical: 11, fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.parchment },
  styleRow: { flexDirection: 'row', gap: 8 },
  styleChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 3, paddingVertical: 10, backgroundColor: theme.colors.background },
  styleChipActive: { borderColor: theme.colors.borderGold, backgroundColor: theme.colors.panelLight },
  styleChipIcon: { width: 19, height: 19 },
  styleChipText: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.parchmentDim },
  styleChipTextActive: { color: theme.colors.goldLight },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 5, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.parchmentDim },
  primaryBtn: { flex: 1, backgroundColor: theme.colors.gold, borderRadius: 5, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.background, fontWeight: 'bold' },
});