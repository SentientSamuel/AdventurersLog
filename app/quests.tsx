import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Image, ActivityIndicator, useWindowDimensions, Keyboard,
  KeyboardAvoidingView, Platform, Pressable, Alert,
} from 'react-native';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { theme } from '../constants/theme';
import { WikiSyncPanel } from '../components/WikiSyncPanel';
import { QUESTS, countsTowardQuestCape, TOTAL_CAPE_QUESTS, TOTAL_CAPE_QP, type Quest, type Difficulty } from '../constants/quest-data';
import {
  getActiveProgressKey,
  getActiveCharacterUsername,
  loadQuestCompletions,
  saveQuestCompletions,
  migrateToPerCharacterProgress,
  setActiveCharacterByUsername,
} from '../constants/character-progress';

const WIKI_API    = 'https://oldschool.runescape.wiki/api.php';
const UA          = 'AdventurersLog-App/1.0';

const UNIQUE_QUESTS = [...QUESTS].sort((a, b) => a.name.localeCompare(b.name));

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Novice:       '#3a8a24',
  Intermediate: '#c8a030',
  Experienced:  '#cc6600',
  Master:       '#8b1a1a',
  Grandmaster:  '#6b0080',
  Special:      '#1a6b8b',
};

// Wiki API

type QuestSection = { index: number; name: string };

const QUEST_SECTIONS = ['details', 'walkthrough', 'rewards', 'required', 'recommended', 'starting', 'finishing'];

function extractWikitext(page: any): string {
  return page?.revisions?.[0]?.slots?.main?.['*']
    ?? page?.revisions?.[0]?.['*']
    ?? '';
}

function cleanWikitext(raw: string): string {
  return raw
    .replace(/\{\{[^{}]*(?:\{\{[^{}]*\}\}[^{}]*)?\}\}/gs, '')
    .replace(/\{\{|\}\}/g, '')
    .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1')
    .replace(/\[\[|\]\]/g, '')
    .replace(/\[https?:\/\/\S+\s([^\]]+)\]/g, '$1')
    .replace(/\[https?:\/\/\S+\]/g, '')
    .replace(/'{2,3}/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\{\|[\s\S]*?\|\}/gs, '')
    .replace(/^\s*[|!].*$/gm, '')
    .replace(/^={2,6}\s*.+?\s*={2,6}\s*$/gm, '')
    .replace(/^(right|left|center|thumb|frame|frameless|\d+px)[|].*$/gm, '')
    .replace(/^\[\[(File|Image):[^\]]*\]\]$/gm, '')
    .replace(/^\*{1,3}\s*/gm, '')
    .replace(/^#{1,3}\s*/gm, '')
    .replace(/^:+\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const _wikitextCache: Record<string, string> = {};

async function fetchQuestWikitext(name: string): Promise<string> {
  if (_wikitextCache[name]) return _wikitextCache[name];
  try {
    const url = `${WIKI_API}?action=query&prop=revisions&rvprop=content&rvslots=*&titles=${encodeURIComponent(name)}&format=json&origin=*`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const data = await res.json();
    const pages = data?.query?.pages ?? {};
    const page = Object.values(pages)[0] as any;
    const wikitext = extractWikitext(page);
    _wikitextCache[name] = wikitext;
    return wikitext;
  } catch { return ''; }
}

function parseQuestSections(wikitext: string): QuestSection[] {
  const sections: QuestSection[] = [];
  const lines = wikitext.split('\n');
  let index = 0;
  for (const line of lines) {
    const match = line.match(/^(={2,4})\s*([^=]+?)\s*\1\s*$/);
    if (match) {
      index++;
      const name = match[2].trim();
      if (QUEST_SECTIONS.some((s) => name.toLowerCase().includes(s))) {
        sections.push({ index, name });
      }
    }
  }
  return sections;
}

function extractSection(wikitext: string, targetIndex: number): string {
  const lines = wikitext.split('\n');
  let currentIndex = 0;
  let inSection = false;
  let sectionLevel = 2;
  const out: string[] = [];
  for (const line of lines) {
    const match = line.match(/^(={2,4})\s*([^=]+?)\s*\1\s*$/);
    if (match) {
      currentIndex++;
      if (inSection && match[1].length <= sectionLevel) break;
      if (currentIndex === targetIndex) { inSection = true; sectionLevel = match[1].length; continue; }
    }
    if (inSection) out.push(line);
  }
  return cleanWikitext(out.join('\n')) || 'No content available.';
}

function parseInfoboxValue(wikitext: string, key: string): string | null {
  const regex = new RegExp(`\\|\\s*${key}\\s*=\\s*([^|\\n}]+)`);
  const match = wikitext.match(regex);
  return match ? match[1].replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1').replace(/<[^>]+>/g, '').trim() : null;
}

// Background

function StoneBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Image source={require('../assets/icons/osrs-bg-scale.png')} style={{ width, height }} resizeMode="cover" />
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject as any}>
        <Defs>
          <RadialGradient id="vigQuests" cx="50%" cy="45%" r="70%">
            <Stop offset="0%"   stopColor="#0d0900" stopOpacity="0.0" />
            <Stop offset="75%"  stopColor="#0d0900" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0d0900" stopOpacity="0.92" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#vigQuests)" />
      </Svg>
    </View>
  );
}

// Progress Bar

function ProgressBar({ completed, total, qpEarned, qpTotal }:
  { completed: number; total: number; qpEarned: number; qpTotal: number }) {
  const pct = total > 0 ? completed / total : 0;
  const { width } = useWindowDimensions();
  const barW = width - 64;
  return (
    <View style={pbStyles.container}>
      <View style={pbStyles.row}>
        <Text style={pbStyles.label}>Quests Complete</Text>
        <Text style={pbStyles.value}>{completed} / {total}</Text>
      </View>
      <View style={[pbStyles.track, { width: barW }]}>
        <View style={[pbStyles.fill, { width: barW * pct }]} />
      </View>
      <View style={pbStyles.row}>
        <Text style={pbStyles.label}>Quest Points</Text>
        <Text style={pbStyles.value}>{qpEarned} / {qpTotal}</Text>
      </View>
    </View>
  );
}

const pbStyles = StyleSheet.create({
  container: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, padding: 14, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.parchmentDark, letterSpacing: 1, textTransform: 'uppercase', paddingTop: 3 },
  value: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.goldLight },
  track: { height: 8, backgroundColor: theme.colors.background, borderRadius: 4, overflow: 'hidden', borderWidth: 1, marginBottom: 2, borderColor: theme.colors.border },
  fill: { height: '100%', backgroundColor: theme.colors.gold, borderRadius: 4 },
});

// Expandable Section

function ExpandableSection({ title, questName, sectionIndex }:
  { title: string; questName: string; sectionIndex: number }) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!expanded && content === null) {
      setLoading(true);
      const wikitext = await fetchQuestWikitext(questName);
      setContent(extractSection(wikitext, sectionIndex));
      setLoading(false);
    }
    setExpanded((v) => !v);
  };

  return (
    <View style={secStyles.container}>
      <TouchableOpacity style={secStyles.header} onPress={handleToggle}>
        <Text style={secStyles.title}>{title}</Text>
        {loading
          ? <ActivityIndicator color={theme.colors.gold} size="small" />
          : <Text style={secStyles.chevron}>{expanded ? '▾' : '▸'}</Text>}
      </TouchableOpacity>
      {expanded && content !== null && (
        <View style={secStyles.body}>
          <Text style={secStyles.content}>{content}</Text>
        </View>
      )}
    </View>
  );
}

const secStyles = StyleSheet.create({
  container: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 12, backgroundColor: theme.colors.panelLight },
  title: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchment, flex: 1 },
  chevron: { color: theme.colors.gold, fontSize: 20, marginLeft: 8 },
  body: { backgroundColor: theme.colors.background, padding: 12 },
  content: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchmentDim, lineHeight: 27 },
});

// Quest Detail Panel

type QuestDetailProps = {
  quest: Quest;
  completed: boolean;
  onToggleComplete: () => void;
};

function QuestDetailPanel({ quest, completed, onToggleComplete }: QuestDetailProps) {
  const [sections, setSections] = useState<QuestSection[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    setSections([]);
    setLoadingSections(true);
    setDescription('');
    fetchQuestWikitext(quest.name).then((wikitext) => {
      const found = parseQuestSections(wikitext);
      setSections(found);
      const desc = parseInfoboxValue(wikitext, 'description') ??
        parseInfoboxValue(wikitext, 'intro') ?? '';
      setDescription(cleanWikitext(desc));
      setLoadingSections(false);
    });
  }, [quest.name]);

  const diffColor = DIFFICULTY_COLORS[quest.difficulty];

  return (
    <View style={qdStyles.container}>
      <View style={qdStyles.header}>
        <Image source={require('../assets/icons/quest-icon.png')} style={qdStyles.icon} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={qdStyles.name}>{quest.name}</Text>
          <View style={qdStyles.tagRow}>
            <View style={[qdStyles.diffTag, { borderColor: diffColor }]}>
              <Text style={[qdStyles.diffText, { color: diffColor }]}>{quest.difficulty}</Text>
            </View>
            <View style={qdStyles.tag}>
              <Text style={qdStyles.tagText}>{quest.members ? 'Members' : 'F2P'}</Text>
            </View>
            {quest.qp > 0 && (
              <View style={[qdStyles.tag, qdStyles.qpTag]}>
                <Text style={qdStyles.tagText}>{quest.qp} QP</Text>
              </View>
            )}
            {quest.miniquest && (
              <View style={qdStyles.tag}>
                <Text style={qdStyles.tagText}>Miniquest</Text>
              </View>
            )}
            {quest.rfdSubquest && (
              <View style={qdStyles.tag}>
                <Text style={qdStyles.tagText}>RFD Part</Text>
              </View>
            )}
          </View>
          {quest.series && (
            <Text style={qdStyles.series}>Series: {quest.series}</Text>
          )}
        </View>
      </View>

      {description ? (
        <Text style={qdStyles.description}>{description}</Text>
      ) : null}

      {loadingSections ? (
        <View style={qdStyles.loadingRow}>
          <ActivityIndicator color={theme.colors.gold} size="small" />
          <Text style={qdStyles.loadingText}>Loading quest info…</Text>
        </View>
      ) : sections.length > 0 ? (
        <View style={qdStyles.sections}>
          <View style={qdStyles.dividerRow}>
            <View style={qdStyles.dividerLine} />
            <View style={qdStyles.diamond} />
            <Text style={qdStyles.dividerLabel}>WIKI INFO</Text>
            <View style={qdStyles.diamond} />
            <View style={qdStyles.dividerLine} />
          </View>
          {sections.map((s) => (
            <ExpandableSection
              key={s.index}
              title={s.name}
              questName={quest.name}
              sectionIndex={s.index}
            />
          ))}
        </View>
      ) : null}

      <TouchableOpacity
        style={[qdStyles.completeBtn, completed && qdStyles.completeBtnDone]}
        onPress={onToggleComplete}
      >
        <Text style={[qdStyles.completeBtnText, completed && qdStyles.completeBtnTextDone]}>
          {completed ? '✓ Completed' : 'Mark as Complete'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const qdStyles = StyleSheet.create({
  container: { backgroundColor: theme.colors.panel, borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 4, padding: 14, gap: 12 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 36, height: 36, marginTop: 2 },
  name: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.parchment, letterSpacing: 0.3, includeFontPadding: false },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  tag: { backgroundColor: theme.colors.panelLight, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.parchmentDim },
  diffTag: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: theme.colors.background },
  diffText: { fontFamily: theme.fonts.display, fontSize: 16, fontWeight: 'bold' },
  qpTag: { borderColor: theme.colors.borderGold },
  series: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.textMuted, marginTop: 10 },
  description: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.parchmentDim, lineHeight: 26, fontStyle: 'italic' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.textMuted },
  sections: { gap: 4 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  diamond: { width: 5, height: 5, backgroundColor: theme.colors.gold, transform: [{ rotate: '45deg' }] },
  dividerLabel: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.goldDim, letterSpacing: 2 },
  completeBtn: { borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 6, paddingVertical: 13, alignItems: 'center', backgroundColor: theme.colors.background },
  completeBtnDone: { backgroundColor: theme.colors.green, borderColor: theme.colors.greenLight },
  completeBtnText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.goldLight, fontWeight: 'bold', letterSpacing: 0.5 },
  completeBtnTextDone: { color: theme.colors.white },
});

// Quest Row
// The checkbox on the left is a separate tappable button so toggling completion
// doesn't also open the quest detail panel.

function QuestRow({ quest, completed, onPress, onToggleComplete }:
  { quest: Quest; completed: boolean; onPress: () => void; onToggleComplete: () => void }) {
  const diffColor = DIFFICULTY_COLORS[quest.difficulty];
  return (
    <View style={qrStyles.row}>
      {/* Tappable checkbox — toggles completion without opening detail */}
      <TouchableOpacity
        style={qrStyles.checkBtn}
        onPress={onToggleComplete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={[qrStyles.checkbox, completed && qrStyles.checkboxDone]}>
          {completed && <Text style={qrStyles.checkMark}>✓</Text>}
        </View>
      </TouchableOpacity>

      {/* Quest name + difficulty — opens detail panel */}
      <TouchableOpacity style={qrStyles.nameArea} onPress={onPress}>
        <Text style={[qrStyles.name, completed && qrStyles.nameDone]}>{quest.name}</Text>
        <Text style={[qrStyles.diff, { color: diffColor }]}>{quest.difficulty}</Text>
      </TouchableOpacity>

      {quest.qp > 0
        ? <Text style={qrStyles.qp}>{quest.qp} QP</Text>
        : quest.miniquest
          ? <Text style={qrStyles.mini}>Miniquest</Text>
          : quest.rfdSubquest
            ? <Text style={qrStyles.mini}>RFD</Text>
            : null}
    </View>
  );
}

const qrStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  // Checkbox button
  checkBtn: {
    padding: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: theme.colors.green,
    borderColor: theme.colors.greenLight,
  },
  checkMark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  // Quest name area
  nameArea: {
    flex: 1,
  },
  name: {
    fontFamily: theme.fonts.display,
    fontSize: 19,
    color: theme.colors.parchment,
  },
  nameDone: {
    color: theme.colors.parchmentDark,
  },
  diff: {
    fontFamily: theme.fonts.display,
    fontSize: 16,
    marginTop: 2,
  },
  qp: {
    fontFamily: theme.fonts.display,
    fontSize: 16,
    color: theme.colors.goldLight,
    minWidth: 30,
    textAlign: 'right',
  },
  mini: {
    fontFamily: theme.fonts.display,
    fontSize: 13,
    color: theme.colors.textMuted,
    minWidth: 30,
    textAlign: 'right',
    fontStyle: 'italic',
  },
});

// Filter bar

type Filter = 'All' | 'F2P' | 'Members' | 'Complete' | 'Incomplete' | 'Miniquests';

function FilterBar({ active, onChange }: { active: Filter; onChange: (f: Filter) => void }) {
  const filters: Filter[] = ['All', 'F2P', 'Members', 'Complete', 'Incomplete', 'Miniquests'];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[fbStyles.chip, active === f && fbStyles.chipActive]}
            onPress={() => onChange(f)}
          >
            <Text style={[fbStyles.text, active === f && fbStyles.textActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const fbStyles = StyleSheet.create({
  chip: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 3, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.panel },
  chipActive: { borderColor: theme.colors.borderGold, backgroundColor: theme.colors.panelLight },
  text: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.parchmentDim },
  textActive: { color: theme.colors.goldLight },
});

// Main Screen

export default function QuestsScreen() {
  const router = useRouter();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [activeUsername, setActiveUsername] = useState<string | null>(null);
  const [progressKey, setProgressKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

  // Refs for auto-scroll
  const scrollViewRef = useRef<ScrollView>(null);
  const detailRef = useRef<View>(null);

  const reloadCompleted = useCallback(async () => {
    await migrateToPerCharacterProgress();
    const key = await getActiveProgressKey();
    const username = await getActiveCharacterUsername();
    setProgressKey(key);
    setActiveUsername(username);
    if (!key) {
      setCompleted(new Set());
      return;
    }
    const quests = await loadQuestCompletions(key);
    setCompleted(quests);
  }, []);

  useFocusEffect(useCallback(() => {
    reloadCompleted();
  }, [reloadCompleted]));

  const handleCharacterChange = useCallback(async (username: string) => {
    await setActiveCharacterByUsername(username);
    await reloadCompleted();
  }, [reloadCompleted]);

  const toggleComplete = useCallback(async (questName: string) => {
    if (!progressKey) {
      Alert.alert('Select a character', 'Choose a saved character in WikiSync below before marking quests.');
      return;
    }
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(questName)) next.delete(questName);
      else next.add(questName);
      saveQuestCompletions(progressKey, next);
      return next;
    });
  }, [progressKey]);

  // When a quest is selected from the list, open its detail and scroll to it
  const handleSelectQuest = useCallback((quest: Quest) => {
    const isAlreadySelected = selectedQuest?.name === quest.name;
    if (isAlreadySelected) {
      setSelectedQuest(null);
      return;
    }
    setSelectedQuest(quest);
    Keyboard.dismiss();
    // Wait a tick for the detail panel to render, then scroll to it
    setTimeout(() => {
      detailRef.current?.measureLayout(
        scrollViewRef.current as any,
        (_x, y) => {
          scrollViewRef.current?.scrollTo({ y: y - 16, animated: true });
        },
        () => {}
      );
    }, 100);
  }, [selectedQuest]);

  const filteredQuests = UNIQUE_QUESTS.filter((q) => {
    if (searchQuery) {
      if (!q.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    }
    if (filter === 'F2P')        return !q.members;
    if (filter === 'Members')    return q.members;
    if (filter === 'Complete')   return completed.has(q.name);
    if (filter === 'Incomplete') return !completed.has(q.name);
    if (filter === 'Miniquests') return Boolean(q.miniquest || q.rfdSubquest);
    return true;
  });

  const capeQuests = UNIQUE_QUESTS.filter(countsTowardQuestCape);
  const completedCount = capeQuests.filter((q) => completed.has(q.name)).length;
  const qpEarned = capeQuests.filter((q) => completed.has(q.name)).reduce((sum, q) => sum + q.qp, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StoneBackground />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
        >
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
              <Text style={styles.screenTitle}>Quests</Text>
              <View style={styles.taglineRow}>
                <View style={styles.ornamentLine} />
                <Text style={styles.ornamentSymbol}>✦</Text>
                <Text style={styles.screenSubtitle}>Your Journey Awaits</Text>
                <Text style={styles.ornamentSymbol}>✦</Text>
                <View style={styles.ornamentLine} />
              </View>
            </View>

            {/* Progress */}
            <View style={styles.section}>
              {activeUsername ? (
                <Text style={styles.activeCharacter}>
                  Tracking: {activeUsername}
                </Text>
              ) : (
                <Text style={styles.activeCharacterMuted}>
                  Select a character in WikiSync to track progress
                </Text>
              )}
              <ProgressBar
                completed={completedCount}
                total={TOTAL_CAPE_QUESTS}
                qpEarned={qpEarned}
                qpTotal={TOTAL_CAPE_QP}
              />
            </View>

            <View style={styles.section}>
              <WikiSyncPanel
                compact
                questNames={UNIQUE_QUESTS.map((q) => q.name)}
                syncTargets={['quests']}
                onSynced={reloadCompleted}
                onCharacterChange={handleCharacterChange}
              />
            </View>

            {/* Quest detail — ref'd so we can scroll to it */}
            {selectedQuest && (
              <View ref={detailRef} style={styles.section}>
                <TouchableOpacity style={styles.backToCats} onPress={() => setSelectedQuest(null)}>
                  <Text style={styles.backToCatsText}>← Back to list</Text>
                </TouchableOpacity>
                <View style={styles.sectionHeader}>
                  <View style={styles.ornamentLine} />
                  <View style={styles.diamond} />
                  <Text style={styles.sectionTitle}>Quest Detail</Text>
                  <View style={styles.diamond} />
                  <View style={styles.ornamentLine} />
                </View>
                <QuestDetailPanel
                  quest={selectedQuest}
                  completed={completed.has(selectedQuest.name)}
                  onToggleComplete={() => toggleComplete(selectedQuest.name)}
                />
              </View>
            )}

            {/* Quest list */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.ornamentLine} />
                <View style={styles.diamond} />
                <Text style={styles.sectionTitle}>Quest List</Text>
                <View style={styles.diamond} />
                <View style={styles.ornamentLine} />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search quests…"
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              <FilterBar active={filter} onChange={setFilter} />
              <Text style={styles.questCount}>{filteredQuests.length} quests</Text>
              <View style={styles.questList}>
                {filteredQuests.map((q) => (
                  <QuestRow
                    key={q.name}
                    quest={q}
                    completed={completed.has(q.name)}
                    onPress={() => handleSelectQuest(q)}
                    onToggleComplete={() => toggleComplete(q.name)}
                  />
                ))}
              </View>
            </View>

          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },

  header: { alignItems: 'center', paddingTop: 10, paddingBottom: 6, marginBottom: 20, gap: 8 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 4, paddingBottom: 10 },
  backButtonText: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.gold, letterSpacing: 0.5 },
  screenTitle: { fontFamily: theme.fonts.display, fontSize: 34, color: theme.colors.gold, letterSpacing: 1, textShadowColor: 'rgba(200,160,48,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12, includeFontPadding: false, lineHeight: 42 },
  screenSubtitle: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.parchmentDim, fontStyle: 'italic', letterSpacing: 1, includeFontPadding: false },
  ornamentRow: { flexDirection: 'row', alignItems: 'center', width: '90%', gap: 6 },
  taglineRow: { flexDirection: 'row', alignItems: 'center', width: '90%', gap: 6 },
  ornamentLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  ornamentSymbol: { color: theme.colors.goldDim, fontSize: 10 },
  ornamentLabel: { fontFamily: theme.fonts.display, fontSize: 11, color: theme.colors.goldDim, letterSpacing: 3, textTransform: 'uppercase', includeFontPadding: false },

  section: { marginBottom: 20 },
  activeCharacter: {
    fontFamily: theme.fonts.display,
    fontSize: 15,
    color: theme.colors.goldLight,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  activeCharacterMuted: {
    fontFamily: theme.fonts.display,
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, marginTop: 5 },
  diamond: { width: 6, height: 6, backgroundColor: theme.colors.gold, transform: [{ rotate: '45deg' }], flexShrink: 0 },
  sectionTitle: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight, letterSpacing: 2, textTransform: 'uppercase', includeFontPadding: false },

  searchInput: { borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 3, backgroundColor: theme.colors.background, paddingHorizontal: 14, paddingVertical: 12, fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchment, marginBottom: 10 },

  questCount: { fontFamily: theme.fonts.display, fontSize: 20, paddingTop: 5, paddingBottom: 10, color: theme.colors.textMuted, marginBottom: 6, letterSpacing: 1 },
  questList: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, backgroundColor: theme.colors.panel, overflow: 'hidden' },

  backToCats: { marginBottom: 10 },
  backToCatsText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.gold },
});