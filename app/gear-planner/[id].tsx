import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Image, Alert,
  useWindowDimensions, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import { theme } from '../../constants/theme';
import {
  Loadout, EQUIPMENT_SLOTS, SlotKey, ItemStats, GearSlots,
  getTotalStats, CombatStyle, AttackStyle, MonsterStats,
  defaultPlayerStats, PlayerStats,
} from '../../constants/equipment-slots';
import { PRAYERS } from '../../constants/prayers';
import { calculateDPS, DEFAULT_MONSTER } from '../../constants/dps-formula';
import { searchItems, fetchItemStats, searchMonsters, fetchMonsterStats, COMMON_MONSTERS, WikiSearchResult } from '../../constants/wiki-api';

const STORAGE_KEY = 'gear_planner_loadouts';

//  Hiscore fetch (lightweight — levels only) 

const SKILL_ORDER = [
  'Attack', 'Defence', 'Strength', 'Hitpoints', 'Ranged',
  'Prayer', 'Magic', 'Cooking', 'Woodcutting', 'Fletching',
  'Fishing', 'Firemaking', 'Crafting', 'Smithing', 'Mining',
  'Herblore', 'Agility', 'Thieving', 'Slayer', 'Farming',
  'Runecraft', 'Hunter', 'Construction', 'Sailing',
];

async function fetchPlayerLevels(username: string): Promise<Partial<PlayerStats> | null> {
  try {
    const url = `https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws?player=${encodeURIComponent(username)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n');
    const levels: Record<string, number> = {};
    SKILL_ORDER.forEach((skill, i) => {
      const parts = lines[i + 1]?.split(',');
      if (parts) levels[skill] = parseInt(parts[1]) || 1;
    });
    return {
      attackLevel:    levels['Attack']    ?? 1,
      strengthLevel:  levels['Strength']  ?? 1,
      defenceLevel:   levels['Defence']   ?? 1,
      rangedLevel:    levels['Ranged']    ?? 1,
      magicLevel:     levels['Magic']     ?? 1,
      hitpointsLevel: levels['Hitpoints'] ?? 10,
    };
  } catch {
    return null;
  }
}

// Slot alias map (wiki slot -> app slot)
// The wiki uses '2h' for two-handed weapons, 'hands' for gloves, 'feet' for boots.
// Map them to our app's SlotKey values for validation.
const SLOT_ALIASES: Record<string, string> = {
  '2h': 'weapon',
  'twohanded': 'weapon',
  'weapon': 'weapon',
  'head': 'head',
  'helm': 'head',
  'cape': 'cape',
  'back': 'cape',
  'neck': 'neck',
  'amulet': 'neck',
  'ammo': 'ammo',
  'ammunition': 'ammo',
  'body': 'body',
  'torso': 'body',
  'shield': 'shield',
  'legs': 'legs',
  'feet': 'boots',
  'boots': 'boots',
  'hands': 'gloves',
  'gloves': 'gloves',
  'ring': 'ring',
};

// Friendly label for the alert (e.g. "body" -> "Body")
function friendlySlotLabel(slot: string): string {
  if (!slot) return 'unknown';
  if (slot === '2h') return 'two-handed weapon';
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}

// Background

function StoneBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Image source={require('../../assets/icons/osrs-bg-scale.png')} style={{ width, height }} resizeMode="cover" />
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject as any}>
        <Defs>
          <RadialGradient id="vig4" cx="50%" cy="45%" r="70%">
            <Stop offset="0%"   stopColor="#0d0900" stopOpacity="0.0" />
            <Stop offset="75%"  stopColor="#0d0900" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0d0900" stopOpacity="0.92" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#vig4)" />
      </Svg>
    </View>
  );
}

// Storage helpers

async function loadLoadouts(): Promise<Loadout[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveLoadouts(loadouts: Loadout[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loadouts));
}

// Sub-components

function SectionDivider({ title }: { title: string }) {
  return (
    <View style={divStyles.row}>
      <View style={divStyles.line} />
      <View style={divStyles.diamond} />
      <Text style={divStyles.title}>{title}</Text>
      <View style={divStyles.diamond} />
      <View style={divStyles.line} />
    </View>
  );
}
const divStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 25 },
  line: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  diamond: { width: 5, height: 5, backgroundColor: theme.colors.gold, transform: [{ rotate: '45deg' }] },
  title: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight, letterSpacing: 2, textTransform: 'uppercase' },
});

function StatRow({ label, value }: { label: string; value: number }) {
  const color = value > 0 ? theme.colors.greenLight : value < 0 ? theme.colors.redLight : theme.colors.parchmentDim;
  return (
    <View style={srStyles.row}>
      <Text style={srStyles.label}>{label}</Text>
      <Text style={[srStyles.value, { color }]}>{value > 0 ? `+${value}` : value}</Text>
    </View>
  );
}
const srStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  label: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.parchmentDim },
  value: { fontFamily: theme.fonts.display, fontSize: 20, fontWeight: 'bold' },
});

// Equipment Layout

const SLOT_LAYOUT: (SlotKey | null)[][] = [
  [null, 'head',   null],
  ['cape', 'neck', 'ammo'],
  ['weapon', 'body', 'shield'],
  [null, 'legs',   null],
  ['gloves', 'boots', 'ring'],
];

function EquipmentGrid({ gear, onSlotPress }: { gear: GearSlots; onSlotPress: (slot: SlotKey) => void }) {
  return (
    <View style={eqStyles.container}>
      {SLOT_LAYOUT.map((row, ri) => (
        <View key={ri} style={eqStyles.row}>
          {row.map((slot, ci) => {
            if (!slot) return <View key={ci} style={eqStyles.emptyCell} />;
            const slotDef = EQUIPMENT_SLOTS.find((s) => s.key === slot)!;
            const item = gear[slot];
            return (
              <TouchableOpacity
                key={ci}
                style={[eqStyles.slot, item && eqStyles.slotFilled]}
                onPress={() => onSlotPress(slot)}
              >
                {item?.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={eqStyles.itemImage} resizeMode="contain" />
                ) : null}
                <Text style={eqStyles.slotLabel} numberOfLines={1}>{item ? item.name : slotDef.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}
const eqStyles = StyleSheet.create({
  container: { gap: 6, marginTop: 10 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  emptyCell: { width: 96, height: 80 },
  slot: {
    width: 96, height: 80, backgroundColor: theme.colors.panel,
    borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4,
  },
  slotFilled: { borderColor: theme.colors.borderGold, backgroundColor: theme.colors.panelLight },
  itemImage: { width: 36, height: 36 },
  slotEmoji: { fontSize: 24 },
  slotLabel: { fontFamily: theme.fonts.display, fontSize: 11, color: theme.colors.parchmentDark, textAlign: 'center' },
});

//  Main Screen

export default function LoadoutEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loadout, setLoadout] = useState<Loadout | null>(null);
  const [allLoadouts, setAllLoadouts] = useState<Loadout[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchSlot, setSearchSlot] = useState<SlotKey | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WikiSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [fetchingItem, setFetchingItem] = useState(false);

  const [showMonsterModal, setShowMonsterModal] = useState(false);
  const [monsterQuery, setMonsterQuery] = useState('');
  const [monsterResults, setMonsterResults] = useState<WikiSearchResult[]>([]);
  const [searchingMonster, setSearchingMonster] = useState(false);
  const [fetchingMonster, setFetchingMonster] = useState(false);

  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [spellMaxHit, setSpellMaxHit] = useState(30);

  // Player search inside stats modal
  const [playerSearchUsername, setPlayerSearchUsername] = useState('');
  const [fetchingPlayer, setFetchingPlayer] = useState(false);

  const searchTimer = useRef<any>(null);

  useEffect(() => {
    loadLoadouts().then((loadouts) => {
      setAllLoadouts(loadouts);
      const found = loadouts.find((l) => l.id === id);
      setLoadout(found ?? null);
      setLoading(false);
    });
  }, [id]);

  const persist = useCallback(async (updated: Loadout) => {
    setLoadout(updated);
    const newAll = allLoadouts.map((l) => l.id === updated.id ? updated : l);
    setAllLoadouts(newAll);
    await saveLoadouts(newAll);
  }, [allLoadouts]);

  // Item search

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchItems(q, searchSlot ?? undefined);
      setSearchResults(results);
      setSearching(false);
    }, 400);
  };

  const handleSelectItem = async (itemName: string) => {
    if (!loadout || !searchSlot) return;
    setFetchingItem(true);

    try {
      const stats = await fetchItemStats(itemName, searchSlot);

      if (stats) {
        // Normalise: lowercase, strip non-alphanumeric chars
        const rawItemSlot = (stats.slot ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetSlot = searchSlot.toLowerCase();
        const normalisedItemSlot = SLOT_ALIASES[rawItemSlot] ?? rawItemSlot;

        // Only validate if we actually parsed a slot value.
        // If we couldn't determine the slot, let it through rather than block
        // legitimate items where the wiki data is unusual.
        if (rawItemSlot && normalisedItemSlot !== targetSlot) {
          const invalidSlotLabel = friendlySlotLabel(stats.slot ?? '');
          const targetSlotLabel = friendlySlotLabel(searchSlot);

          // Close the modal FIRST so iOS can present the alert above it
          setFetchingItem(false);
          setSearchSlot(null);
          setSearchQuery('');
          setSearchResults([]);

          // iOS needs the modal dismiss animation to complete before the alert
          // is presented, otherwise the alert can be swallowed silently.
          const delay = Platform.OS === 'ios' ? 400 : 0;
          setTimeout(() => {
            Alert.alert(
              'Invalid Slot',
              `This is a ${invalidSlotLabel} item. It cannot be equipped in the ${targetSlotLabel} slot.`
            );
          }, delay);
          return;
        }

        // Valid - equip the item
        await persist({
          ...loadout,
          gear: { ...loadout.gear, [searchSlot]: stats },
          updatedAt: Date.now(),
        });
      } else {
        // Fallback placeholder for items the wiki couldn't return stats for.
        // No validation possible here - trust the user's slot choice.
        const placeholder: ItemStats = {
          name: itemName,
          slot: searchSlot,
          attackStab: 0, attackSlash: 0, attackCrush: 0,
          attackMagic: 0, attackRanged: 0,
          defenceStab: 0, defenceSlash: 0, defenceCrush: 0,
          defenceMagic: 0, defenceRanged: 0,
          meleeStrength: 0, rangedStrength: 0, magicDamage: 0,
          prayer: 0, attackSpeed: 4,
          imageUrl: `https://oldschool.runescape.wiki/images/${itemName.replace(/ /g, '_')}.png`,
        };
        await persist({ ...loadout, gear: { ...loadout.gear, [searchSlot]: placeholder }, updatedAt: Date.now() });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setFetchingItem(false);
      setSearchSlot(null);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleRemoveItem = async (slot: SlotKey) => {
    if (!loadout) return;
    const newGear = { ...loadout.gear };
    delete newGear[slot];
    await persist({ ...loadout, gear: newGear, updatedAt: Date.now() });
    setSearchSlot(null);
  };

  // Monster search

  const handleMonsterSearch = async (q: string) => {
    setMonsterQuery(q);
    if (!q.trim()) { setMonsterResults([]); return; }
    setSearchingMonster(true);
    const results = await searchMonsters(q);
    setMonsterResults(results);
    setSearchingMonster(false);
  };

  const handleSelectMonster = async (name: string) => {
    if (!loadout) return;
    setFetchingMonster(true);
    const monster = await fetchMonsterStats(name);
    const fallback = COMMON_MONSTERS.find((m) => m.name.toLowerCase() === name.toLowerCase());
    const final = monster ?? fallback ?? { ...DEFAULT_MONSTER, name };
    await persist({ ...loadout, targetMonster: final, updatedAt: Date.now() });
    setFetchingMonster(false);
    setShowMonsterModal(false);
    setMonsterQuery('');
    setMonsterResults([]);
  };

  const handleSelectCommonMonster = async (monster: MonsterStats) => {
    if (!loadout) return;
    await persist({ ...loadout, targetMonster: monster, updatedAt: Date.now() });
    setShowMonsterModal(false);
  };

  // Prayers

  const togglePrayer = async (key: string) => {
    if (!loadout) return;
    const prayers = loadout.prayers.includes(key)
      ? loadout.prayers.filter((p) => p !== key)
      : [...loadout.prayers, key];
    await persist({ ...loadout, prayers, updatedAt: Date.now() });
  };

  // Player search

  const handlePlayerSearch = async () => {
    if (!loadout || !playerSearchUsername.trim()) return;
    setFetchingPlayer(true);
    const levels = await fetchPlayerLevels(playerSearchUsername.trim());
    if (!levels) {
      Alert.alert('Not Found', `Could not find "${playerSearchUsername.trim()}" on the OSRS Hiscores. Check the spelling and try again.`);
      setFetchingPlayer(false);
      return;
    }
    await persist({
      ...loadout,
      playerStats: { ...loadout.playerStats, ...levels },
      updatedAt: Date.now(),
    });
    setPlayerSearchUsername('');
    setFetchingPlayer(false);
  };

  //  Player stats

  const updatePlayerStat = async (key: keyof PlayerStats, value: string) => {
    if (!loadout) return;
    const num = Math.min(99, Math.max(1, parseInt(value) || 1));
    await persist({ ...loadout, playerStats: { ...loadout.playerStats, [key]: num }, updatedAt: Date.now() });
  };

  const ATTACK_STYLES: Record<CombatStyle, { key: AttackStyle; label: string }[]> = {
    melee: [
      { key: 'accurate', label: 'Accurate' },
      { key: 'aggressive', label: 'Aggressive' },
      { key: 'controlled', label: 'Controlled' },
      { key: 'defensive', label: 'Defensive' },
    ],
    ranged: [
      { key: 'accurate', label: 'Accurate' },
      { key: 'rapid', label: 'Rapid' },
      { key: 'longrange', label: 'Longrange' },
    ],
    magic: [
      { key: 'standard', label: 'Standard' },
      { key: 'defensive_magic', label: 'Defensive' },
    ],
  };

  // DPS

  const dpsResult = loadout ? calculateDPS(
    loadout.combatStyle,
    loadout.gear,
    loadout.playerStats,
    loadout.prayers,
    loadout.attackStyle,
    loadout.targetMonster ?? DEFAULT_MONSTER,
    spellMaxHit,
  ) : null;

  const totalStats = loadout ? getTotalStats(loadout.gear) : null;
  const relevantPrayers = PRAYERS.filter(
    (p) => p.combatStyle === loadout?.combatStyle || p.combatStyle === 'all'
  );

  if (loading || !loadout) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.gold} size="large" />
          <Text style={styles.loadingText}>Loading loadout...</Text>
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
            <Text style={styles.backButtonText}>← Loadouts</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{loadout.name.toUpperCase()}</Text>
          <View style={styles.taglineRow}>
            <View style={styles.ornamentLine} />
            <Text style={styles.ornamentSymbol}>✦</Text>
            <Text style={styles.screenSubtitle}>
              {loadout.combatStyle.charAt(0).toUpperCase() + loadout.combatStyle.slice(1)} Loadout
            </Text>
            <Text style={styles.ornamentSymbol}>✦</Text>
            <View style={styles.ornamentLine} />
          </View>
        </View>

        <EquipmentGrid
          gear={loadout.gear}
          onSlotPress={(slot) => { setSearchSlot(slot); setSearchQuery(''); setSearchResults([]); }}
        />

        <SectionDivider title="Attack Style" />
        <View style={styles.chipRow}>
          {ATTACK_STYLES[loadout.combatStyle].map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.chip, loadout.attackStyle === s.key && styles.chipActive]}
              onPress={() => persist({ ...loadout, attackStyle: s.key, updatedAt: Date.now() })}
            >
              <Text style={[styles.chipText, loadout.attackStyle === s.key && styles.chipTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionDivider title="Prayers" />
        <TouchableOpacity style={styles.selectorButton} onPress={() => setShowPrayerModal(true)}>
          <Text style={styles.selectorButtonText}>
            {loadout.prayers.length === 0 ? 'Select Prayers...' : `${loadout.prayers.length} prayer${loadout.prayers.length > 1 ? 's' : ''} active`}
          </Text>
          <Text style={styles.selectorArrow}>›</Text>
        </TouchableOpacity>
        {loadout.prayers.length > 0 && (
          <View style={styles.activePrayers}>
            {loadout.prayers.map((key) => {
              const p = PRAYERS.find((pr) => pr.key === key);
              return p ? (
                <View key={key} style={styles.activePrayerChip}>
                  <Text style={styles.activePrayerText}>{p.name}</Text>
                </View>
              ) : null;
            })}
          </View>
        )}

        <SectionDivider title="Your Levels" />
        <TouchableOpacity style={styles.selectorButton} onPress={() => setShowStatsModal(true)}>
          <Text style={styles.selectorButtonText}>
            Atk {loadout.playerStats.attackLevel} · Str {loadout.playerStats.strengthLevel} · Rng {loadout.playerStats.rangedLevel} · Mage {loadout.playerStats.magicLevel}
          </Text>
          <Text style={styles.selectorArrow}>›</Text>
        </TouchableOpacity>

        {loadout.combatStyle === 'magic' && (
          <>
            <SectionDivider title="Spell Max Hit" />
            <View style={styles.spellRow}>
              <Text style={styles.spellLabel}>Base spell max hit:</Text>
              <TextInput
                style={styles.spellInput}
                value={spellMaxHit.toString()}
                onChangeText={(v) => setSpellMaxHit(Math.max(1, parseInt(v) || 1))}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          </>
        )}

        <SectionDivider title="Target Monster" />
        <TouchableOpacity style={styles.selectorButton} onPress={() => setShowMonsterModal(true)}>
          <Text style={styles.selectorButtonText}>
            {loadout.targetMonster ? loadout.targetMonster.name : 'Select a monster...'}
          </Text>
          <Text style={styles.selectorArrow}>›</Text>
        </TouchableOpacity>
        {loadout.targetMonster && (
          <View style={styles.monsterStats}>
            <Text style={styles.monsterStatText}>DEF {loadout.targetMonster.defenceLevel} · HP {loadout.targetMonster.hitpoints}</Text>
            <Text style={styles.monsterStatText}>
              Stab {loadout.targetMonster.defenceStab} · Slash {loadout.targetMonster.defenceSlash} · Crush {loadout.targetMonster.defenceCrush}
            </Text>
            <Text style={styles.monsterStatText}>
              Magic {loadout.targetMonster.defenceMagic} · Range {loadout.targetMonster.defenceRanged}
            </Text>
          </View>
        )}

        {totalStats && (
          <>
            <SectionDivider title="Gear Bonuses" />
            <View style={styles.statsPanel}>
              <View style={styles.statsCol}>
                <Text style={styles.statsGroupLabel}>Attack</Text>
                <StatRow label="Stab"   value={totalStats.attackStab} />
                <StatRow label="Slash"  value={totalStats.attackSlash} />
                <StatRow label="Crush"  value={totalStats.attackCrush} />
                <StatRow label="Magic"  value={totalStats.attackMagic} />
                <StatRow label="Ranged" value={totalStats.attackRanged} />
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsCol}>
                <Text style={styles.statsGroupLabel}>Defence</Text>
                <StatRow label="Stab"   value={totalStats.defenceStab} />
                <StatRow label="Slash"  value={totalStats.defenceSlash} />
                <StatRow label="Crush"  value={totalStats.defenceCrush} />
                <StatRow label="Magic"  value={totalStats.defenceMagic} />
                <StatRow label="Ranged" value={totalStats.defenceRanged} />
              </View>
            </View>
            <View style={styles.statsPanel}>
              <View style={styles.statsCol}>
                <Text style={styles.statsGroupLabel}>Other</Text>
                <StatRow label="Melee Str"  value={totalStats.meleeStrength} />
                <StatRow label="Ranged Str" value={totalStats.rangedStrength} />
                <StatRow label="Magic Dmg"  value={totalStats.magicDamage} />
                <StatRow label="Prayer"     value={totalStats.prayer} />
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsCol}>
                <Text style={styles.statsGroupLabel}>Speed</Text>
                <StatRow label="Atk Speed" value={totalStats.attackSpeed} />
              </View>
            </View>
          </>
        )}

        {dpsResult && (
          <>
            <SectionDivider title="DPS Calculator" />
            <View style={styles.dpsPanel}>
              <View style={styles.dpsRow}>
                <View style={styles.dpsStat}>
                  <Text style={styles.dpsValue}>{dpsResult.dps}</Text>
                  <Text style={styles.dpsLabel}>DPS</Text>
                </View>
                <View style={styles.dpsDivider} />
                <View style={styles.dpsStat}>
                  <Text style={styles.dpsValue}>{dpsResult.maxHit}</Text>
                  <Text style={styles.dpsLabel}>Max Hit</Text>
                </View>
                <View style={styles.dpsDivider} />
                <View style={styles.dpsStat}>
                  <Text style={styles.dpsValue}>{dpsResult.hitChance}%</Text>
                  <Text style={styles.dpsLabel}>Accuracy</Text>
                </View>
              </View>
              <View style={styles.dpsRow2}>
                <Text style={styles.dpsSubtext}>
                  vs {loadout.targetMonster?.name ?? 'Training Dummy'} · {dpsResult.attacksPerSecond}/s · Avg {dpsResult.expectedDamage} dmg/hit
                </Text>
              </View>
              <View style={styles.dpsTtk}>
                <Text style={styles.dpsTtkLabel}>Time to Kill</Text>
                <Text style={styles.dpsTtkValue}>
                  {loadout.targetMonster
                    ? `~${Math.round(loadout.targetMonster.hitpoints / dpsResult.dps)}s`
                    : 'Set a monster to calculate'}
                </Text>
              </View>
            </View>
          </>
        )}

      </ScrollView>

      {/* Slot search modal */}
      <Modal visible={!!searchSlot} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>
                {searchSlot ? EQUIPMENT_SLOTS.find((s) => s.key === searchSlot)?.label : ''} Slot
              </Text>
              {searchSlot && loadout.gear[searchSlot] && (
                <TouchableOpacity style={styles.removeItemBtn} onPress={() => handleRemoveItem(searchSlot)}>
                  <Text style={styles.removeItemBtnText}>✕ Remove {loadout.gear[searchSlot]?.name}</Text>
                </TouchableOpacity>
              )}
              <TextInput
                style={styles.input}
                placeholder="Search for an item..."
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoFocus
              />
              {searching || fetchingItem ? (
                <ActivityIndicator color={theme.colors.gold} style={{ marginTop: 12 }} />
              ) : (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.title}
                  style={styles.resultsList}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectItem(item.title)}>
                      <Image source={{ uri: item.imageUrl }} style={styles.resultItemImage} resizeMode="contain" />
                      <Text style={styles.resultItemText}>{item.title}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    searchQuery.length > 0
                      ? <Text style={styles.noResults}>No results — try a different name</Text>
                      : null
                  }
                />
              )}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setSearchSlot(null); setSearchQuery(''); setSearchResults([]); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Monster modal */}
      <Modal visible={showMonsterModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Target Monster</Text>
              <TextInput
                style={styles.input}
                placeholder="Search for a monster..."
                placeholderTextColor={theme.colors.textMuted}
                value={monsterQuery}
                onChangeText={handleMonsterSearch}
                autoFocus
              />
              {searchingMonster || fetchingMonster ? (
                <ActivityIndicator color={theme.colors.gold} style={{ marginTop: 12 }} />
              ) : monsterQuery.length > 0 ? (
                <FlatList
                  data={monsterResults}
                  keyExtractor={(item) => item.title}
                  style={styles.resultsList}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectMonster(item.title)}>
                      <Text style={styles.resultItemText}>{item.title}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={styles.noResults}>No results</Text>}
                />
              ) : (
                <>
                  <Text style={styles.commonLabel}>Common Targets</Text>
                  <FlatList
                    data={COMMON_MONSTERS}
                    keyExtractor={(m) => m.name}
                    style={styles.resultsList}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectCommonMonster(item)}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.resultItemText}>{item.name}</Text>
                          <Text style={styles.resultItemMeta}>DEF {item.defenceLevel} · HP {item.hitpoints}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                </>
              )}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowMonsterModal(false); setMonsterQuery(''); setMonsterResults([]); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Prayer modal */}
      <Modal visible={showPrayerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Prayers</Text>
            <ScrollView style={styles.prayerList}>
              {relevantPrayers.map((prayer) => {
                const active = loadout.prayers.includes(prayer.key);
                return (
                  <TouchableOpacity
                    key={prayer.key}
                    style={[styles.prayerRow, active && styles.prayerRowActive]}
                    onPress={() => togglePrayer(prayer.key)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.prayerName, active && styles.prayerNameActive]}>{prayer.name}</Text>
                      <Text style={styles.prayerDesc}>
                        {[
                          prayer.attackBonus         && `+${Math.round((prayer.attackBonus - 1) * 100)}% Atk`,
                          prayer.strengthBonus       && `+${Math.round((prayer.strengthBonus - 1) * 100)}% Str`,
                          prayer.rangedAttackBonus   && `+${Math.round((prayer.rangedAttackBonus - 1) * 100)}% Rng Atk`,
                          prayer.rangedStrengthBonus && `+${Math.round((prayer.rangedStrengthBonus - 1) * 100)}% Rng Str`,
                          prayer.magicAttackBonus    && `+${Math.round((prayer.magicAttackBonus - 1) * 100)}% Mage Atk`,
                          prayer.magicDamageBonus    && `+${Math.round((prayer.magicDamageBonus - 1) * 100)}% Mage Dmg`,
                          prayer.defenceBonus        && `+${Math.round((prayer.defenceBonus - 1) * 100)}% Def`,
                        ].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <View style={[styles.prayerCheck, active && styles.prayerCheckActive]}>
                      {active && <Text style={styles.prayerCheckMark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowPrayerModal(false)}>
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Player stats modal */}
      <Modal visible={showStatsModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Your Levels</Text>

              {/* Player Search */}
              <View style={styles.playerSearchRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="OSRS username..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={playerSearchUsername}
                  onChangeText={setPlayerSearchUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={handlePlayerSearch}
                />
                <TouchableOpacity
                  style={[styles.playerSearchBtn, fetchingPlayer && styles.playerSearchBtnDisabled]}
                  onPress={handlePlayerSearch}
                  disabled={fetchingPlayer}
                >
                  {fetchingPlayer
                    ? <ActivityIndicator color={theme.colors.background} size="small" />
                    : <Text style={styles.playerSearchBtnText}>Search</Text>
                  }
                </TouchableOpacity>
              </View>
              <Text style={styles.playerSearchHint}>
                Auto-fill from hiscores, or enter manually below
              </Text>

              {/* Manual level inputs */}
              <ScrollView style={{ maxHeight: 260 }}>
                {([
                  { key: 'attackLevel',    label: 'Attack',    relevant: loadout.combatStyle === 'melee' },
                  { key: 'strengthLevel',  label: 'Strength',  relevant: loadout.combatStyle === 'melee' },
                  { key: 'defenceLevel',   label: 'Defence',   relevant: true },
                  { key: 'rangedLevel',    label: 'Ranged',    relevant: loadout.combatStyle === 'ranged' },
                  { key: 'magicLevel',     label: 'Magic',     relevant: loadout.combatStyle === 'magic' },
                  { key: 'hitpointsLevel', label: 'Hitpoints', relevant: true },
                ] as { key: keyof PlayerStats; label: string; relevant: boolean }[]).filter((s) => s.relevant).map((s) => (
                  <View key={s.key} style={styles.statInputRow}>
                    <Text style={styles.statInputLabel}>{s.label}</Text>
                    <TextInput
                      style={styles.statInput}
                      value={loadout.playerStats[s.key].toString()}
                      onChangeText={(v) => updatePlayerStat(s.key, v)}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.primaryBtn} onPress={() => { setShowStatsModal(false); setPlayerSearchUsername(''); }}>
                <Text style={styles.primaryBtnText}>Done</Text>
              </TouchableOpacity>
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

  header: { alignItems: 'center', paddingTop: 10, paddingBottom: 6, marginBottom: 4, gap: 8 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 4, paddingBottom: 6 },
  backButtonText: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.gold, letterSpacing: 0.5 },
  screenTitle: {
    fontFamily: theme.fonts.display, fontSize: 28, color: theme.colors.gold, letterSpacing: 1,
    textShadowColor: 'rgba(200,160,48,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
    includeFontPadding: false, lineHeight: 36, textAlign: 'center',
  },
  screenSubtitle: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.parchmentDim, fontStyle: 'italic', letterSpacing: 1 },
  taglineRow: { flexDirection: 'row', alignItems: 'center', width: '90%', gap: 6 },
  ornamentLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  ornamentSymbol: { color: theme.colors.goldDim, fontSize: 10 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4, justifyContent: 'center' },
  chip: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 5, paddingHorizontal: 15, paddingVertical: 15, backgroundColor: theme.colors.panel },
  chipActive: { borderColor: theme.colors.borderGold, backgroundColor: theme.colors.panelLight },
  chipText: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.parchmentDim },
  chipTextActive: { color: theme.colors.goldLight },

  selectorButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.panel, borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 12 },
  selectorButtonText: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchment, flex: 1 },
  selectorArrow: { fontFamily: theme.fonts.display, fontSize: 22, color: theme.colors.gold },

  activePrayers: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  activePrayerChip: { backgroundColor: theme.colors.panelLight, borderWidth: 1, borderColor: theme.colors.borderGold, borderRadius: 5, paddingHorizontal: 15, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  activePrayerText: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.goldLight },

  monsterStats: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 5, padding: 10, marginTop: 8, gap: 4 },
  monsterStatText: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.parchmentDim },

  statsPanel: { flexDirection: 'row', backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, padding: 15, marginBottom: 8 },
  statsCol: { flex: 1, gap: 2 },
  statsDivider: { width: 1, backgroundColor: theme.colors.border, marginHorizontal: 12 },
  statsGroupLabel: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.gold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },

  spellRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },
  spellLabel: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.parchment },
  spellInput: { borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 5, backgroundColor: theme.colors.background, paddingHorizontal: 10, paddingVertical: 6, fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.goldLight, width: 60, textAlign: 'center' },

  dpsPanel: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderGold, borderRadius: 4, padding: 16, gap: 10 },
  dpsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  dpsStat: { flex: 1, alignItems: 'center', gap: 4 },
  dpsValue: { fontFamily: theme.fonts.display, fontSize: 32, color: theme.colors.goldLight, includeFontPadding: false },
  dpsLabel: { fontFamily: theme.fonts.display, fontSize: 13, color: theme.colors.parchmentDark, letterSpacing: 1, textTransform: 'uppercase' },
  dpsDivider: { width: 1, height: 40, backgroundColor: theme.colors.border },
  dpsRow2: { alignItems: 'center' },
  dpsSubtext: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.textMuted, textAlign: 'center' },
  dpsTtk: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10 },
  dpsTtkLabel: { fontFamily: theme.fonts.display, fontSize: 13, color: theme.colors.parchmentDark, letterSpacing: 1, textTransform: 'uppercase' },
  dpsTtkValue: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.gold },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: theme.colors.panel, borderTopWidth: 2, borderTopColor: theme.colors.borderGold, borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 20, gap: 12, maxHeight: '90%' },
  modalTitle: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight, letterSpacing: 1 },
  input: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 5, backgroundColor: theme.colors.background, paddingHorizontal: 12, paddingVertical: 11, fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchment },
  resultsList: { maxHeight: 300 },
  resultItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  resultItemImage: { width: 28, height: 28 },
  resultItemText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchment, flex: 1 },
  resultItemMeta: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.textMuted },
  noResults: { fontFamily: theme.fonts.display, fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  commonLabel: { fontFamily: theme.fonts.display, fontSize: 12, color: theme.colors.parchmentDark, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  removeItemBtn: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.redLight, borderRadius: 5, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  removeItemBtnText: { fontFamily: theme.fonts.display, fontSize: 13, color: theme.colors.redLight },
  cancelBtn: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 5, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchmentDim },
  primaryBtn: { backgroundColor: theme.colors.gold, borderRadius: 5, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.background, fontWeight: 'bold' },

  prayerList: { maxHeight: 320 },
  prayerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 10 },
  prayerRowActive: { backgroundColor: theme.colors.panelLight },
  prayerName: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchment, paddingLeft: 10 },
  prayerNameActive: { color: theme.colors.goldLight },
  prayerDesc: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.textMuted, marginTop: 2, paddingLeft: 10 },
  prayerCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, marginRight: 10, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  prayerCheckActive: { backgroundColor: theme.colors.gold, borderColor: theme.colors.gold },
  prayerCheckMark: { color: theme.colors.background, fontSize: 13, fontWeight: 'bold' },

  statInputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  statInputLabel: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchment },
  statInput: { borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 5, backgroundColor: theme.colors.background, paddingHorizontal: 10, paddingVertical: 6, fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight, width: 60, textAlign: 'center' },

  // Player search
  playerSearchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  playerSearchBtn: { backgroundColor: theme.colors.gold, borderRadius: 5, paddingVertical: 11, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  playerSearchBtnDisabled: { backgroundColor: theme.colors.goldDim },
  playerSearchBtnText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.background, fontWeight: 'bold' },
  playerSearchHint: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.textMuted, fontStyle: 'italic' },
});