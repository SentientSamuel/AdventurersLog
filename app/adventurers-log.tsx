import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
  ImageSourcePropType,
  useWindowDimensions,
  Keyboard,
} from 'react-native';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../constants/theme';type SkillName =
  | 'Attack' | 'Defence' | 'Strength' | 'Hitpoints' | 'Ranged'
  | 'Prayer' | 'Magic' | 'Cooking' | 'Woodcutting' | 'Fletching'
  | 'Fishing' | 'Firemaking' | 'Crafting' | 'Smithing' | 'Mining'
  | 'Herblore' | 'Agility' | 'Thieving' | 'Slayer' | 'Farming'
  | 'Runecraft' | 'Hunter' | 'Construction' | 'Sailing';

// API order — used for parsing hiscores response only
const SKILL_NAMES_API: SkillName[] = [
  'Attack', 'Defence', 'Strength', 'Hitpoints', 'Ranged',
  'Prayer', 'Magic', 'Cooking', 'Woodcutting', 'Fletching',
  'Fishing', 'Firemaking', 'Crafting', 'Smithing', 'Mining',
  'Herblore', 'Agility', 'Thieving', 'Slayer', 'Farming',
  'Runecraft', 'Hunter', 'Construction', 'Sailing',
];

// In-game grid order — used for display, total level, XP, and level up detection
const SKILL_NAMES: SkillName[] = [
  'Attack',       'Hitpoints',  'Mining',
  'Strength',     'Agility',    'Smithing',
  'Defence',      'Herblore',   'Fishing',
  'Ranged',       'Thieving',   'Cooking',
  'Prayer',       'Crafting',   'Firemaking',
  'Magic',        'Fletching',  'Woodcutting',
  'Runecraft',    'Slayer',     'Farming',
  'Construction', 'Hunter',     'Sailing',
];

const BOSS_NAMES: string[] = [
  'Abyssal Sire', 'Alchemical Hydra', 'Amoxliatl', 'Araxxor', 'Artio',
  'Barrows Chests', 'Bryophyta', 'Brutus', 'Callisto', 'Calvar\'ion', 'Cerberus',
  'Chambers of Xeric', 'Chambers of Xeric: CM', 'Chaos Elemental', 'Chaos Fanatic',
  'Commander Zilyana', 'Corporeal Beast', 'Crazy Archaeologist', 'Dagannoth Prime',
  'Dagannoth Rex', 'Dagannoth Supreme', 'Deranged Archaeologist', 'Duke Sucellus',
  'General Graardor', 'Giant Mole', 'Grotesque Guardians', 'Hespori',
  'Kalphite Queen', 'King Black Dragon', 'Kraken', 'Kree\'arra',
  'K\'ril Tsutsaroth', 'Lunar Chests', 'Mimic', 'Nex', 'Nightmare',
  'Phosani\'s Nightmare', 'Obor', 'Phantom Muspah', 'Sarachnis', 'Scorpia',
  'Scurrius', 'Skotizo', 'Sol Heredit', 'Spindel', 'Tempoross',
  'The Gauntlet', 'The Corrupted Gauntlet', 'The Leviathan', 'The Royal Titans', 'The Whisperer',
  'Theatre of Blood', 'Theatre of Blood: HM', 'Thermonuclear Smoke Devil',
  'Tombs of Amascut', 'Tombs of Amascut: Expert', 'TzKal-Zuk', 'TzTok-Jad',
  'Vardorvis', 'Venenatis', 'Vet\'ion', 'Vorkath', 'Wintertodt',
  'Zalcano', 'Zulrah',
];

const SKILL_ICONS: Record<SkillName, ImageSourcePropType> = {
  Attack:       require('../assets/icons/skills/Attack.png'),
  Defence:      require('../assets/icons/skills/Defence.png'),
  Strength:     require('../assets/icons/skills/Strength.png'),
  Hitpoints:    require('../assets/icons/skills/Hitpoints.png'),
  Ranged:       require('../assets/icons/skills/Ranged.png'),
  Prayer:       require('../assets/icons/skills/Prayer.png'),
  Magic:        require('../assets/icons/skills/Magic.png'),
  Cooking:      require('../assets/icons/skills/Cooking.png'),
  Woodcutting:  require('../assets/icons/skills/Woodcutting.png'),
  Fletching:    require('../assets/icons/skills/Fletching.png'),
  Fishing:      require('../assets/icons/skills/Fishing.png'),
  Firemaking:   require('../assets/icons/skills/Firemaking.png'),
  Crafting:     require('../assets/icons/skills/Crafting.png'),
  Smithing:     require('../assets/icons/skills/Smithing.png'),
  Mining:       require('../assets/icons/skills/Mining.png'),
  Herblore:     require('../assets/icons/skills/Herblore.png'),
  Agility:      require('../assets/icons/skills/Agility.png'),
  Thieving:     require('../assets/icons/skills/Thieving.png'),
  Slayer:       require('../assets/icons/skills/Slayer.png'),
  Farming:      require('../assets/icons/skills/Farming.png'),
  Runecraft:    require('../assets/icons/skills/Runecraft.png'),
  Hunter:       require('../assets/icons/skills/Hunter.png'),
  Construction: require('../assets/icons/skills/Construction.png'),
  Sailing:      require('../assets/icons/skills/Sailing.png'),
};

const QUEST_ICON       = require('../assets/icons/quest-icon.png');
const AUTO_ICON        = require('../assets/icons/menu/skills.png');
const ACHIEVEMENT_ICON = require('../assets/icons/achievement-icon.png');
const MILESTONE_ICON   = require('../assets/icons/milestone-icon.png');
const ADV_LOG_ICON     = require('../assets/icons/menu/adventurers-log.png');
const COMBAT_ICON      = require('../assets/icons/combat-icon.png');
const NOTE_ICON        = require('../assets/icons/old_notes_detail.png');

function formatXP(xp: number): string {
  if (xp >= 1_000_000) {
    const val = xp / 1_000_000;
    return `${Number(val.toFixed(1))}m`;
  }
  if (xp >= 1_000) {
    const val = xp / 1_000;
    return `${Number(val.toFixed(1))}k`;
  }
  return xp.toString();
}

type SkillSnapshot = Record<SkillName, { level: number; xp: number }>;
type BossKC = Record<string, number>;

type JournalEntry = {
  id: string;
  type: 'levelup' | 'manual' | 'auto';
  text: string;
  detail?: string;
  timestamp: number;
  category?: 'Quest' | 'Achievement' | 'Milestone' | 'Note';
  skill?: SkillName;
};

type Character = {
  id: string;
  username: string;
  lastSnapshot?: SkillSnapshot;
  bossKC?: BossKC;
  lastChecked?: number;
  journal: JournalEntry[];
};

async function fetchHiscores(username: string): Promise<{ snapshot: SkillSnapshot; bossKC: BossKC } | null> {
  try {
    const url = `https://secure.runescape.com/m=hiscore_oldschool/index_lite.json?player=${encodeURIComponent(username)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    // Parse skills by name from JSON response
    const snapshot: Partial<SkillSnapshot> = {};
    const skillsData = data?.skills ?? [];
    skillsData.forEach((entry: { name: string; level: number; xp: number }) => {
      const name = entry.name as SkillName;
      if (SKILL_NAMES_API.includes(name)) {
        snapshot[name] = { level: entry.level ?? 1, xp: entry.xp ?? 0 };
      }
    });

    // Parse boss KCs by name from JSON response
    const bossKC: BossKC = {};
    const activitiesData = data?.activities ?? [];
    activitiesData.forEach((entry: { name: string; score: number }) => {
      if (entry.score > 0 && BOSS_NAMES.includes(entry.name)) {
        bossKC[entry.name] = entry.score;
      }
    });

    return { snapshot: snapshot as SkillSnapshot, bossKC };
  } catch { return null; }
}

function detectLevelUps(old: SkillSnapshot, next: SkillSnapshot): JournalEntry[] {
  const entries: JournalEntry[] = [];
  SKILL_NAMES.forEach((skill) => {
    const oldLevel = old[skill]?.level ?? 0;
    const newLevel = next[skill]?.level ?? 0;
    if (newLevel > oldLevel) {
      entries.push({
        id: `${Date.now()}-${skill}-${Math.random()}`,
        type: 'levelup',
        text: `Levelled up ${skill}! (${oldLevel} → ${newLevel})`,
        detail: `${skill} is now level ${newLevel}.`,
        timestamp: Date.now(),
        skill,
      });
    }
  });
  return entries;
}

const STORAGE_KEY = 'adventurers_log_characters';

async function loadCharacters(): Promise<Character[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveCharacters(chars: Character[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(chars));
}

function StoneBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Image source={require('../assets/icons/osrs-bg-scale.png')} style={{ width, height }} resizeMode="cover" />
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject as any}>
        <Defs>
          <RadialGradient id="vignette2" cx="50%" cy="45%" r="70%">
            <Stop offset="0%"   stopColor="#0d0900" stopOpacity="0.0" />
            <Stop offset="75%"  stopColor="#0d0900" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0d0900" stopOpacity="0.92" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#vignette2)" />
      </Svg>
    </View>
  );
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SkillCell({ skill, level }: { skill: SkillName; level: number }) {
  const isMaxed = level >= 99;
  return (
    <View style={[styles.skillCell, isMaxed && styles.skillCellMaxed]}>
      <Image source={SKILL_ICONS[skill]} style={styles.skillIcon} resizeMode="contain" />
      <Text style={[styles.skillLevel, isMaxed && styles.skillLevelMaxed]}>{level}</Text>
      <Text style={styles.skillName} numberOfLines={1}>{skill}</Text>
    </View>
  );
}

function BossCard({ name, kc }: { name: string; kc: number }) {
  return (
    <View style={styles.bossCard}>
      <Text style={styles.bossName} numberOfLines={2}>{name}</Text>
      <Text style={styles.bossKC}>{kc.toLocaleString()}</Text>
    </View>
  );
}

function JournalCard({ entry }: { entry: JournalEntry }) {
  const isLevelUp = entry.type === 'levelup';
  const date = new Date(entry.timestamp);
  const dateStr = date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
  const useQuestIcon       = entry.category === 'Quest';
  const useAchievementIcon = entry.category === 'Achievement';
  const useMilestoneIcon   = entry.category === 'Milestone';
  const useAutoIcon        = entry.type === 'auto';
  return (
    <View style={[styles.journalCard, isLevelUp && styles.journalCardLevelUp]}>
      <View style={styles.journalCardLeft}>
        {isLevelUp && entry.skill
          ? <Image source={SKILL_ICONS[entry.skill]} style={styles.journalSkillIcon} resizeMode="contain" />
          : useQuestIcon       ? <Image source={QUEST_ICON}       style={styles.journalSkillIcon} resizeMode="contain" />
          : useAchievementIcon ? <Image source={ACHIEVEMENT_ICON} style={styles.journalSkillIcon} resizeMode="contain" />
          : useMilestoneIcon   ? <Image source={MILESTONE_ICON}   style={styles.journalSkillIcon} resizeMode="contain" />
          : useAutoIcon        ? <Image source={AUTO_ICON}        style={styles.journalSkillIcon} resizeMode="contain" />
          :                      <Image source={NOTE_ICON}        style={styles.journalSkillIcon} resizeMode="contain" />
        }
      </View>
      <View style={styles.journalCardContent}>
        <Text style={[styles.journalCardText, isLevelUp && styles.journalCardTextLevelUp]}>{entry.text}</Text>
        {entry.detail ? <Text style={styles.journalCardDetail}>{entry.detail}</Text> : null}
        <Text style={styles.journalCardDate}>{dateStr} at {timeStr}</Text>
      </View>
    </View>
  );
}

export default function AdventurersLogScreen() {
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [autoChecking, setAutoChecking] = useState(false);
  const [showAddChar, setShowAddChar] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEntryText, setNewEntryText] = useState('');
  const [newEntryDetail, setNewEntryDetail] = useState('');
  const [newEntryCategory, setNewEntryCategory] = useState<JournalEntry['category']>('Note');

  const activeChar = characters.find((c) => c.id === activeCharId) ?? null;

  const persist = useCallback(async (updated: Character[]) => {
    setCharacters(updated);
    await saveCharacters(updated);
  }, []);

  useEffect(() => {
    const init = async () => {
      const chars = await loadCharacters();
      setCharacters(chars);
      if (chars.length > 0) {
        setActiveCharId(chars[0].id);
        setAutoChecking(true);
        const updated = await Promise.all(
          chars.map(async (char) => {
            const result = await fetchHiscores(char.username);
            if (!result) return char;
            let newEntries: JournalEntry[] = [];
            if (char.lastSnapshot) newEntries = detectLevelUps(char.lastSnapshot, result.snapshot);
            return {
              ...char,
              lastSnapshot: result.snapshot,
              bossKC: result.bossKC,
              lastChecked: Date.now(),
              journal: newEntries.length > 0 ? [...newEntries, ...char.journal] : char.journal,
            };
          })
        );
        await saveCharacters(updated);
        setCharacters(updated);
        setAutoChecking(false);
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleCheckLevels = async () => {
    if (!activeChar) return;
    setChecking(true);
    const result = await fetchHiscores(activeChar.username);
    if (!result) {
      Alert.alert('Error', 'Could not reach the OSRS Hiscores. Check your connection.');
      setChecking(false);
      return;
    }
    let newEntries: JournalEntry[] = [];
    if (activeChar.lastSnapshot) newEntries = detectLevelUps(activeChar.lastSnapshot, result.snapshot);
    if (newEntries.length === 0) {
      newEntries = [{
        id: `${Date.now()}-check`, type: 'auto',
        text: 'Checked hiscores — no new level ups detected.',
        detail: 'Remember: hiscores only update after logging out of OSRS.',
        timestamp: Date.now(),
      }];
    }
    const updated = characters.map((c) =>
      c.id === activeChar.id
        ? { ...c, lastSnapshot: result.snapshot, bossKC: result.bossKC, lastChecked: Date.now(), journal: [...newEntries, ...c.journal] }
        : c
    );
    await persist(updated);
    setChecking(false);
  };

  const handleAddCharacter = async () => {
    const username = newUsername.trim();
    if (!username) return;
    setChecking(true);
    const result = await fetchHiscores(username);
    if (!result) {
      Alert.alert('Not Found', `Could not find "${username}" on the OSRS Hiscores. Check the spelling and try again.`);
      setChecking(false);
      return;
    }
    const totalLevel = SKILL_NAMES.reduce((sum, s) => sum + (result.snapshot[s]?.level ?? 1), 0);
    const newChar: Character = {
      id: `${Date.now()}`, username,
      lastSnapshot: result.snapshot, bossKC: result.bossKC, lastChecked: Date.now(),
      journal: [{ id: `${Date.now()}-added`, type: 'auto', text: `${username} added to Adventurer's Log.`, detail: `Total level: ${totalLevel}`, timestamp: Date.now() }],
    };
    const updated = [...characters, newChar];
    await persist(updated);
    setActiveCharId(newChar.id);
    setNewUsername('');
    setShowAddChar(false);
    setChecking(false);
  };

  const handleAddEntry = async () => {
    if (!activeChar || !newEntryText.trim()) return;
    const entry: JournalEntry = {
      id: `${Date.now()}-manual`, type: 'manual',
      text: newEntryText.trim(), detail: newEntryDetail.trim() || undefined,
      timestamp: Date.now(), category: newEntryCategory,
    };
    const updated = characters.map((c) => c.id === activeChar.id ? { ...c, journal: [entry, ...c.journal] } : c);
    await persist(updated);
    setNewEntryText(''); setNewEntryDetail(''); setNewEntryCategory('Note');
    setShowAddEntry(false);
  };

  const handleDeleteCharacter = () => {
    if (!activeChar) return;
    Alert.alert('Remove Character', `Remove ${activeChar.username} from your log? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const updated = characters.filter((c) => c.id !== activeChar.id);
        await persist(updated);
        setActiveCharId(updated.length > 0 ? updated[0].id : null);
      }},
    ]);
  };

  const totalLevel  = activeChar?.lastSnapshot ? SKILL_NAMES.reduce((sum, s) => sum + (activeChar.lastSnapshot![s]?.level ?? 1), 0) : 0;
  const maxedSkills = activeChar?.lastSnapshot ? SKILL_NAMES.filter((s) => (activeChar.lastSnapshot![s]?.level ?? 0) >= 99).length : 0;
  const totalXP     = activeChar?.lastSnapshot ? SKILL_NAMES.reduce((sum, s) => sum + (activeChar.lastSnapshot![s]?.xp ?? 0), 0) : 0;
  const bossEntries = activeChar?.bossKC
    ? Object.entries(activeChar.bossKC).filter(([, kc]) => kc > 0).sort(([, a], [, b]) => b - a)
    : [];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.gold} size="large" />
          <Text style={styles.loadingText}>Loading your log...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
        >
          {/* Pressable fills the whole scroll area so tapping anywhere dismisses keyboard */}
          <Pressable onPress={Keyboard.dismiss}>

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
              <Text style={styles.screenTitle}>Adventurer's Log</Text>
              <View style={styles.taglineRow}>
                <View style={styles.ornamentLine} />
                <Text style={styles.ornamentSymbol}>✦</Text>
                <Text style={styles.screenSubtitle}>Track Your Journey</Text>
                <Text style={styles.ornamentSymbol}>✦</Text>
                <View style={styles.ornamentLine} />
              </View>
            </View>

            {autoChecking && (
              <View style={styles.autoCheckBanner}>
                <ActivityIndicator color={theme.colors.gold} size="small" />
                <Text style={styles.autoCheckText}>Checking hiscores for all characters...</Text>
              </View>
            )}

            {/* Characters */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Characters</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => setShowAddChar(true)}>
                  <Text style={styles.addButtonText}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {characters.length === 0 ? (
                <View style={styles.emptyState}>
                  <Image source={COMBAT_ICON} style={styles.emptyStateIcon} resizeMode="contain" />
                  <Text style={styles.emptyStateText}>No characters yet.</Text>
                  <Text style={styles.emptyStateSubtext}>Add your OSRS username to start tracking your adventures.</Text>
                  <TouchableOpacity style={styles.primaryButton} onPress={() => setShowAddChar(true)}>
                    <Text style={styles.primaryButtonText}>Add Character</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {characters.map((char) => (
                    <TouchableOpacity
                      key={char.id}
                      style={[styles.charChip, char.id === activeCharId && styles.charChipActive]}
                      onPress={() => setActiveCharId(char.id)}
                    >
                      <Text style={[styles.charChipText, char.id === activeCharId && styles.charChipTextActive]}>
                        {char.username}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {activeChar && (
              <>
                <View style={styles.charPanel}>
                  <View style={styles.charPanelTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.charName}>{activeChar.username}</Text>
                      {activeChar.lastChecked ? (
                        <Text style={styles.charLastChecked}>
                          Last checked: {new Date(activeChar.lastChecked).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity onPress={handleDeleteCharacter} style={styles.removeButton}>
                      <Text style={styles.deleteText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  {activeChar.lastSnapshot ? (
                    <View style={styles.statRow}>
                      <StatBlock label="Total Level" value={totalLevel} />
                      <View style={styles.statDivider} />
                      <StatBlock label="Level 99's" value={maxedSkills} />
                      <View style={styles.statDivider} />
                      <StatBlock label="Total XP" value={formatXP(totalXP)} />
                    </View>
                  ) : null}
                  <TouchableOpacity
                    style={[styles.primaryButton, checking && styles.primaryButtonDisabled]}
                    onPress={handleCheckLevels} disabled={checking}
                  >
                    {checking
                      ? <ActivityIndicator color={theme.colors.background} size="small" />
                      : <View style={styles.checkButtonInner}>
                          <Image source={ADV_LOG_ICON} style={styles.checkButtonIcon} resizeMode="contain" />
                          <Text style={styles.primaryButtonText}>Check for Level Ups</Text>
                        </View>
                    }
                  </TouchableOpacity>
                </View>

                {activeChar.lastSnapshot ? (
                  <View style={styles.section}>
                    <View style={styles.skillsHeader}>
                      <View style={styles.ornamentLine} />
                      <View style={styles.diamond} />
                      <Text style={styles.sectionTitle}>Skills</Text>
                      <View style={styles.diamond} />
                      <View style={styles.ornamentLine} />
                    </View>
                    <View style={styles.skillsGrid}>
                      {SKILL_NAMES.map((skill) => (
                        <SkillCell key={skill} skill={skill} level={activeChar.lastSnapshot![skill]?.level ?? 1} />
                      ))}
                    </View>
                  </View>
                ) : null}

                {bossEntries.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.skillsHeader}>
                      <View style={styles.ornamentLine} />
                      <View style={styles.diamond} />
                      <Text style={styles.sectionTitle}>Boss Kill Counts</Text>
                      <View style={styles.diamond} />
                      <View style={styles.ornamentLine} />
                    </View>
                    <View style={styles.bossGrid}>
                      {bossEntries.map(([name, kc]) => <BossCard key={name} name={name} kc={kc} />)}
                    </View>
                  </View>
                )}

                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Events</Text>
                    <TouchableOpacity style={styles.addButton} onPress={() => setShowAddEntry(true)}>
                      <Text style={styles.addButtonText}>+ Entry</Text>
                    </TouchableOpacity>
                  </View>
                  {activeChar.journal.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Image source={COMBAT_ICON} style={styles.emptyStateIcon} resizeMode="contain" />
                      <Text style={styles.emptyStateText}>No events yet.</Text>
                      <Text style={styles.emptyStateSubtext}>Log out of OSRS then open this screen — any level ups will appear here automatically.</Text>
                    </View>
                  ) : (
                    activeChar.journal.slice(0, 50).map((entry) => <JournalCard key={entry.id} entry={entry} />)
                  )}
                </View>
              </>
            )}

          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add Character Modal */}
      <Modal visible={showAddChar} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Add Character</Text>
              <Text style={styles.modalSubtitle}>Enter your OSRS username exactly as it appears in game.</Text>
              <TextInput
                style={styles.input} placeholder="e.g. Zezima" placeholderTextColor={theme.colors.textMuted}
                value={newUsername} onChangeText={setNewUsername}
                autoCapitalize="none" autoCorrect={false} returnKeyType="done" onSubmitEditing={handleAddCharacter}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowAddChar(false); setNewUsername(''); }}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, { flex: 1 }, checking && styles.primaryButtonDisabled]} onPress={handleAddCharacter} disabled={checking}>
                  {checking ? <ActivityIndicator color={theme.colors.background} size="small" /> : <Text style={styles.primaryButtonText}>Add Character</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Entry Modal */}
      <Modal visible={showAddEntry} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>New Journal Entry</Text>
              <View style={styles.categoryRow}>
                {(['Quest', 'Achievement', 'Milestone', 'Note'] as JournalEntry['category'][]).map((cat) => (
                  <TouchableOpacity key={cat} style={[styles.categoryChip, newEntryCategory === cat && styles.categoryChipActive]} onPress={() => setNewEntryCategory(cat)}>
                    <Text style={[styles.categoryChipText, newEntryCategory === cat && styles.categoryChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="What happened? (e.g. Completed Dragon Slayer II)"
                placeholderTextColor={theme.colors.textMuted}
                value={newEntryText}
                onChangeText={setNewEntryText}
                autoCorrect={false}
              />
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Extra notes (optional)"
                placeholderTextColor={theme.colors.textMuted}
                value={newEntryDetail}
                onChangeText={setNewEntryDetail}
                multiline
                numberOfLines={3}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowAddEntry(false); setNewEntryText(''); setNewEntryDetail(''); }}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={handleAddEntry}>
                  <Text style={styles.primaryButtonText}>Save</Text>
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
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchmentDim },
  autoCheckBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  autoCheckText: { fontFamily: theme.fonts.display, fontSize: 12, color: theme.colors.parchmentDim },
  header: { alignItems: 'center', paddingTop: 10, paddingBottom: 6, marginBottom: 12, gap: 8 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 4, paddingBottom: 10 },
  backButtonText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.gold, letterSpacing: 0.5 },
  screenTitle: { fontFamily: theme.fonts.display, fontSize: 34, color: theme.colors.gold, letterSpacing: 1, textShadowColor: 'rgba(200,160,48,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12, includeFontPadding: false, lineHeight: 42 },
  screenSubtitle: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.parchmentDim, fontStyle: 'italic', letterSpacing: 1, includeFontPadding: false },
  ornamentRow: { flexDirection: 'row', alignItems: 'center', width: '90%', gap: 6 },
  taglineRow: { flexDirection: 'row', alignItems: 'center', width: '90%', gap: 6 },
  ornamentLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  ornamentSymbol: { color: theme.colors.goldDim, fontSize: 10 },
  ornamentLabel: { fontFamily: theme.fonts.display, fontSize: 11, color: theme.colors.goldDim, letterSpacing: 3, textTransform: 'uppercase', includeFontPadding: false },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight, letterSpacing: 2, textTransform: 'uppercase', includeFontPadding: false },
  skillsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  diamond: { width: 6, height: 6, backgroundColor: theme.colors.gold, transform: [{ rotate: '45deg' }], flexShrink: 0 },
  addButton: { borderWidth: 1, borderColor: theme.colors.borderGold, borderRadius: 3, paddingHorizontal: 12, paddingVertical: 6 },
  addButtonText: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.gold, fontWeight: 'bold' },
  charChip: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 3, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, backgroundColor: theme.colors.panel },
  charChipActive: { borderColor: theme.colors.borderGold, backgroundColor: theme.colors.panelLight },
  charChipText: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.parchmentDim },
  charChipTextActive: { color: theme.colors.goldLight },
  charPanel: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 4, backgroundColor: theme.colors.panel, padding: 16, gap: 14, marginBottom: 20 },
  charPanelTop: { flexDirection: 'row', alignItems: 'flex-start' },
  charName: { fontFamily: theme.fonts.display, fontSize: 22, color: theme.colors.parchment, letterSpacing: 0.5 },
  charLastChecked: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.textMuted, marginTop: 3 },
  removeButton: { paddingLeft: 12, paddingTop: 4 },
  deleteText: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.redLight, fontWeight: 'bold' },
  statRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.colors.border, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingVertical: 12 },
  statBlock: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontFamily: theme.fonts.display, fontSize: 34, color: theme.colors.goldLight, includeFontPadding: false },
  statLabel: { fontFamily: theme.fonts.display, fontSize: 12, color: theme.colors.parchmentDark, letterSpacing: 1, textTransform: 'uppercase', includeFontPadding: false },
  statDivider: { width: 1, height: 36, backgroundColor: theme.colors.border },
  checkButtonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkButtonIcon: { width: 22, height: 22 },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingBottom: 2 },
  skillCell: { width: '30%', backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center', gap: 4 },
  skillCellMaxed: { borderColor: theme.colors.borderGold, backgroundColor: theme.colors.panelLight },
  skillIcon: { width: 30, height: 30 },
  skillLevel: { fontFamily: theme.fonts.display, fontSize: 23, color: theme.colors.parchment, includeFontPadding: false },
  skillLevelMaxed: { color: theme.colors.goldLight },
  skillName: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.parchmentDark, textAlign: 'center', includeFontPadding: false },
  bossGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bossCard: { width: '30%', backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', gap: 4, flexGrow: 1 },
  bossName: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.parchmentDark, textAlign: 'center', includeFontPadding: false },
  bossKC: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight, includeFontPadding: false },
  journalCard: { flexDirection: 'row', backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, padding: 12, marginBottom: 8, gap: 12, alignItems: 'flex-start' },
  journalCardLevelUp: { borderColor: theme.colors.borderGold, backgroundColor: theme.colors.panelLight },
  journalCardLeft: { width: 32, alignItems: 'center', paddingTop: 2 },
  journalSkillIcon: { width: 26, height: 26 },
  journalCardContent: { flex: 1, gap: 4 },
  journalCardText: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.parchment, lineHeight: 26, includeFontPadding: false },
  journalCardTextLevelUp: { color: theme.colors.goldLight },
  journalCardDetail: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.parchmentDim, lineHeight: 22, includeFontPadding: false },
  journalCardDate: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.textMuted, marginTop: 2, includeFontPadding: false },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyStateIcon: { width: 30, height: 30 },
  emptyStateText: { fontFamily: theme.fonts.display, fontSize: 30, color: theme.colors.parchmentDim, includeFontPadding: false },
  emptyStateSubtext: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 24, paddingBottom: 10, paddingHorizontal: 20, includeFontPadding: false },
  primaryButton: { backgroundColor: theme.colors.gold, borderRadius: 6, paddingVertical: 13, paddingHorizontal: 25, alignItems: 'center', justifyContent: 'center' },
  primaryButtonDisabled: { backgroundColor: theme.colors.goldDim },
  primaryButtonText: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.background, letterSpacing: 0.5, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { width: '100%', backgroundColor: theme.colors.panel, borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 4, padding: 20, gap: 12 },
  modalTitle: { fontFamily: theme.fonts.display, fontSize: 22, color: theme.colors.goldLight, letterSpacing: 1 },
  modalSubtitle: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.parchmentDim, lineHeight: 22 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancel: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.parchmentDim },
  input: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 3, backgroundColor: theme.colors.background, paddingHorizontal: 12, paddingVertical: 11, fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.parchment },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  categoryChip: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.colors.background },
  categoryChipActive: { borderColor: theme.colors.borderGold, backgroundColor: theme.colors.panelLight },
  categoryChipText: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.parchmentDim },
  categoryChipTextActive: { color: theme.colors.goldLight },
});