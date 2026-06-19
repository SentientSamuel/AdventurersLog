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
import {
  getActiveProgressKey,
  getActiveCharacterUsername,
  loadDiaryCompletions,
  saveDiaryCompletions,
  migrateToPerCharacterProgress,
  setActiveCharacterByUsername,
} from '../constants/character-progress';

const WIKI_API    = 'https://oldschool.runescape.wiki/api.php';
const UA          = 'AdventurersLog-App/1.0';

// Diary data

type Tier = 'Easy' | 'Medium' | 'Hard' | 'Elite';

type Diary = {
  name:        string;
  area:        string;
  reward:      string;
  taskmaster:  string;
  highestSkill:string;
  wikiPage:    string;
  tiers: {
    tier:        Tier;
    tasks:       number;
    reward:      string;
    topSkill:    string;
  }[];
};

const DIARIES: Diary[] = [
  {
    name: 'Ardougne Diary',
    area: 'Ardougne',
    reward: 'Ardougne cloak',
    taskmaster: 'Two-pints',
    highestSkill: 'Magic 94',
    wikiPage: 'Ardougne_Diary',
    tiers: [
      { tier: 'Easy',   tasks: 12, reward: 'Ardougne cloak 1 — noted drops from Hemenster fishing',   topSkill: 'Thieving 25' },
      { tier: 'Medium', tasks: 11, reward: 'Ardougne cloak 2 — 10% more marks of grace on Seers',      topSkill: 'Fletching 50' },
      { tier: 'Hard',   tasks: 14, reward: 'Ardougne cloak 3 — 25% more marks on Ardougne rooftop',    topSkill: 'Magic 68' },
      { tier: 'Elite',  tasks: 7,  reward: 'Ardougne cloak 4 — unlimited Camelot teleports to bank',   topSkill: 'Magic 94' },
    ],
  },
  {
    name: 'Desert Diary',
    area: 'Kharidian Desert',
    reward: 'Desert amulet',
    taskmaster: 'Jarr',
    highestSkill: 'Fletching 95',
    wikiPage: 'Desert_Diary',
    tiers: [
      { tier: 'Easy',   tasks: 13, reward: 'Desert amulet 1 — extra daily doses of Nardah healing pool', topSkill: 'Thieving 21' },
      { tier: 'Medium', tasks: 12, reward: 'Desert amulet 2 — access to Kalphite Lair shortcut',         topSkill: 'Slayer 65' },
      { tier: 'Hard',   tasks: 11, reward: 'Desert amulet 3 — free Pharaoh\'s sceptre charges',          topSkill: 'Firemaking 75' },
      { tier: 'Elite',  tasks: 5,  reward: 'Desert amulet 4 — unlimited teleports to Nardah',            topSkill: 'Fletching 95' },
    ],
  },
  {
    name: 'Falador Diary',
    area: 'Asgarnia / Falador',
    reward: 'Falador shield',
    taskmaster: 'Sir Rebral',
    highestSkill: 'Farming 91',
    wikiPage: 'Falador_Diary',
    tiers: [
      { tier: 'Easy',   tasks: 13, reward: 'Falador shield 1 — free Prayer restore once daily at Falador', topSkill: 'Agility 15' },
      { tier: 'Medium', tasks: 12, reward: 'Falador shield 2 — entry to Mining Guild at 59 Mining',        topSkill: 'Herblore 52' },
      { tier: 'Hard',   tasks: 12, reward: 'Falador shield 3 — access to White Knight armoury at 1 def',   topSkill: 'Smithing 65' },
      { tier: 'Elite',  tasks: 8,  reward: 'Falador shield 4 — giant mole drops noted + 2 Farming patches', topSkill: 'Farming 91' },
    ],
  },
  {
    name: 'Fremennik Diary',
    area: 'Fremennik Province',
    reward: 'Fremennik sea boots',
    taskmaster: 'Thorodin',
    highestSkill: 'Slayer 83',
    wikiPage: 'Fremennik_Diary',
    tiers: [
      { tier: 'Easy',   tasks: 10, reward: 'Fremennik sea boots 1 — noted boots from Dagannoth Kings',  topSkill: 'Crafting 23' },
      { tier: 'Medium', tasks: 11, reward: 'Fremennik sea boots 2 — free Peer the Seer enchantment',    topSkill: 'Agility 55' },
      { tier: 'Hard',   tasks: 10, reward: 'Fremennik sea boots 3 — Slayer helm bonus vs Dagannoth',    topSkill: 'Slayer 75' },
      { tier: 'Elite',  tasks: 5,  reward: 'Fremennik sea boots 4 — 50% off Lunar Isle boat',           topSkill: 'Slayer 83' },
    ],
  },
  {
    name: 'Kandarin Diary',
    area: 'Kandarin',
    reward: 'Kandarin headgear',
    taskmaster: 'The \'Wedge\'',
    highestSkill: 'Smithing 90',
    wikiPage: 'Kandarin_Diary',
    tiers: [
      { tier: 'Easy',   tasks: 15, reward: 'Kandarin headgear 1 — 10% more marks on Seers\' rooftop',  topSkill: 'Fishing 16' },
      { tier: 'Medium', tasks: 14, reward: 'Kandarin headgear 2 — coal bag from Sherlock',              topSkill: 'Magic 56' },
      { tier: 'Hard',   tasks: 13, reward: 'Kandarin headgear 3 — 10% more Barbarian fishing XP',      topSkill: 'Crafting 70' },
      { tier: 'Elite',  tasks: 8,  reward: 'Kandarin headgear 4 — 15% more Barbarian fishing XP',      topSkill: 'Smithing 90' },
    ],
  },
  {
    name: 'Karamja Diary',
    area: 'Karamja',
    reward: 'Karamja gloves',
    taskmaster: 'Pirate Jackie the Fruit',
    highestSkill: 'Runecraft 91',
    wikiPage: 'Karamja_Diary',
    tiers: [
      { tier: 'Easy',   tasks: 11, reward: 'Karamja gloves 1 — 10% more gems from Shilo Village mine', topSkill: 'Cooking 30' },
      { tier: 'Medium', tasks: 11, reward: 'Karamja gloves 2 — noted drops from Jogres',               topSkill: 'Agility 52' },
      { tier: 'Hard',   tasks: 10, reward: 'Karamja gloves 3 — access to Shilo Village gem mine shortcut', topSkill: 'Herblore 72' },
      { tier: 'Elite',  tasks: 5,  reward: 'Karamja gloves 4 — free access to TzHaar Fight Cave/Inferno', topSkill: 'Runecraft 91' },
    ],
  },
  {
    name: 'Kourend & Kebos Diary',
    area: 'Great Kourend & Kebos',
    reward: 'Rada\'s blessing',
    taskmaster: 'Elise',
    highestSkill: 'Slayer 95',
    wikiPage: 'Kourend_%26_Kebos_Diary',
    tiers: [
      { tier: 'Easy',   tasks: 10, reward: 'Rada\'s blessing 1 — 2 daily teleports to Kourend',          topSkill: 'Fishing 20' },
      { tier: 'Medium', tasks: 11, reward: 'Rada\'s blessing 2 — 4 daily teleports to Kourend',           topSkill: 'Slayer 60' },
      { tier: 'Hard',   tasks: 10, reward: 'Rada\'s blessing 3 — 6 daily teleports + 10% more fish at underwater',  topSkill: 'Slayer 82' },
      { tier: 'Elite',  tasks: 6,  reward: 'Rada\'s blessing 4 — unlimited Kourend teleports',             topSkill: 'Slayer 95' },
    ],
  },
  {
    name: 'Lumbridge & Draynor Diary',
    area: 'Lumbridge & Draynor',
    reward: 'Explorer\'s ring',
    taskmaster: 'Hatius Cosaintus',
    highestSkill: 'Smithing 88',
    wikiPage: 'Lumbridge_%26_Draynor_Diary',
    tiers: [
      { tier: 'Easy',   tasks: 13, reward: 'Explorer\'s ring 1 — 30 free cabbage port teleports daily',  topSkill: 'Crafting 10' },
      { tier: 'Medium', tasks: 12, reward: 'Explorer\'s ring 2 — 45 cabbage teleports + run restore',    topSkill: 'Crafting 40' },
      { tier: 'Hard',   tasks: 10, reward: 'Explorer\'s ring 3 — 30% alchemy boost at Mage Training',   topSkill: 'Runecraft 56' },
      { tier: 'Elite',  tasks: 8,  reward: 'Explorer\'s ring 4 — unlimited cabbage teleports',           topSkill: 'Smithing 88' },
    ],
  },
  {
    name: 'Morytania Diary',
    area: 'Morytania',
    reward: 'Morytania legs',
    taskmaster: 'Le-sabrè',
    highestSkill: 'Fishing 96',
    wikiPage: 'Morytania_Diary',
    tiers: [
      { tier: 'Easy',   tasks: 11, reward: 'Morytania legs 1 — 2 daily teleports to Burgh de Rott',    topSkill: 'Crafting 25' },
      { tier: 'Medium', tasks: 11, reward: 'Morytania legs 2 — 50% more Slayer XP from Barrows chests', topSkill: 'Slayer 50' },
      { tier: 'Hard',   tasks: 11, reward: 'Morytania legs 3 — 50% more Prayer XP from bones in Ectofuntus', topSkill: 'Agility 71' },
      { tier: 'Elite',  tasks: 5,  reward: 'Morytania legs 4 — double Mort Myre fungi, noted sacred eel',    topSkill: 'Fishing 96' },
    ],
  },
  {
    name: 'Varrock Diary',
    area: 'Varrock & Misthalin',
    reward: 'Varrock armour',
    taskmaster: 'Toby',
    highestSkill: 'Cooking 95',
    wikiPage: 'Varrock_Diary',
    tiers: [
      { tier: 'Easy',   tasks: 13, reward: 'Varrock armour 1 — 10% chance of double ores when mining',  topSkill: 'Herblore 10' },
      { tier: 'Medium', tasks: 12, reward: 'Varrock armour 2 — 10% chance of double bars when smelting', topSkill: 'Smithing 40' },
      { tier: 'Hard',   tasks: 13, reward: 'Varrock armour 3 — bonus extends to adamantite',             topSkill: 'Herblore 76' },
      { tier: 'Elite',  tasks: 7,  reward: 'Varrock armour 4 — bonus extends to runite',                 topSkill: 'Cooking 95' },
    ],
  },
  {
    name: 'Western Provinces Diary',
    area: 'Western Provinces',
    reward: 'Western banner',
    taskmaster: 'Elder gnome child',
    highestSkill: 'Slayer 93',
    wikiPage: 'Western_Provinces_Diary',
    tiers: [
      { tier: 'Easy',   tasks: 12, reward: 'Western banner 1 — 10% more Agility XP from Gnome course',  topSkill: 'Agility 25' },
      { tier: 'Medium', tasks: 11, reward: 'Western banner 2 — free Ape Atoll Agility course entry',     topSkill: 'Ranging 70' },
      { tier: 'Hard',   tasks: 11, reward: 'Western banner 3 — 10% more hunter XP on specific creatures', topSkill: 'Hunter 69' },
      { tier: 'Elite',  tasks: 5,  reward: 'Western banner 4 — free access to Puro-Puro from anywhere',  topSkill: 'Slayer 93' },
    ],
  },
  {
    name: 'Wilderness Diary',
    area: 'Wilderness',
    reward: 'Wilderness sword',
    taskmaster: 'Lesser Fanatic',
    highestSkill: 'Magic 96',
    wikiPage: 'Wilderness_Diary',
    tiers: [
      { tier: 'Easy',   tasks: 12, reward: 'Wilderness sword 1 — 50% more Slayer XP from Wilderness tasks', topSkill: 'Magic 33' },
      { tier: 'Medium', tasks: 11, reward: 'Wilderness sword 2 — access to shortcut north of Edgeville',     topSkill: 'Magic 56' },
      { tier: 'Hard',   tasks: 11, reward: 'Wilderness sword 3 — 50% more lava dragon bones',                topSkill: 'Slayer 83' },
      { tier: 'Elite',  tasks: 6,  reward: 'Wilderness sword 4 — free unlimited Revenant Cave entry',        topSkill: 'Magic 96' },
    ],
  },
];

const TIER_COLORS: Record<Tier, string> = {
  Easy:   '#3a8a24',
  Medium: '#c8a030',
  Hard:   '#cc6600',
  Elite:  '#8b1a1a',
};

const TOTAL_TIERS = DIARIES.length * 4; // 12 diaries × 4 tiers = 48

// Storage key helpers
// Keys are stored as "DiaryName|Tier" e.g. "Ardougne Diary|Easy"

function tierKey(diary: Diary, tier: Tier) { return `${diary.name}|${tier}`; }

// Wiki API

type WikiSection = { index: number; name: string };

const DIARY_SECTIONS = ['easy', 'medium', 'hard', 'elite'];

function extractWikitext(page: any): string {
  return page?.revisions?.[0]?.slots?.main?.['*']
    ?? page?.revisions?.[0]?.['*']
    ?? '';
}

function cleanWikitext(raw: string): string {
  return raw
    // Remove templates {{...}}
    .replace(/\{\{[^{}]*(?:\{\{[^{}]*\}\}[^{}]*)?\}\}/gs, '')
    // Remove any remaining {{ or }}
    .replace(/\{\{|\}\}/g, '')
    // Clean wiki links [[link|text]] or [[link]]
    .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1')
    // Remove any remaining [[ or ]]
    .replace(/\[\[|\]\]/g, '')
    // Remove external links [url text]
    .replace(/\[https?:\/\/\S+\s([^\]]+)\]/g, '$1')
    .replace(/\[https?:\/\/\S+\]/g, '')
    // Remove bold/italic markup
    .replace(/'{2,3}/g, '')
    // Remove refs
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<ref[^>]*\/>/g, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove tables
    .replace(/\{\|[\s\S]*?\|\}/gs, '')
    .replace(/^\s*[|!].*$/gm, '')
    // Remove section headers ===...===
    .replace(/^={2,6}\s*.+?\s*={2,6}\s*$/gm, '')
    // Remove image/file markup (thumb, right|thumb|, File:, Image:)
    .replace(/^(right|left|center|thumb|frame|frameless|\d+px)[|].*$/gm, '')
    .replace(/^\[\[(File|Image):[^\]]*\]\]$/gm, '')
    // Remove wiki list markers (* and #) and bold markers (**)
    .replace(/^\*{1,3}\s*/gm, '')
    .replace(/^#{1,3}\s*/gm, '')
    // Remove : indentation markers
    .replace(/^:+\s*/gm, '')
    // Collapse excess blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const _wikitextCache: Record<string, string> = {};

async function fetchDiaryWikitext(wikiPage: string): Promise<string> {
  if (_wikitextCache[wikiPage]) return _wikitextCache[wikiPage];
  try {
    const url = `${WIKI_API}?action=query&prop=revisions&rvprop=content&rvslots=*&titles=${encodeURIComponent(wikiPage)}&format=json&origin=*`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const data = await res.json();
    const pages = data?.query?.pages ?? {};
    const page = Object.values(pages)[0] as any;
    const wikitext = extractWikitext(page);
    _wikitextCache[wikiPage] = wikitext;
    return wikitext;
  } catch { return ''; }
}

function parseDiarySections(wikitext: string): WikiSection[] {
  const sections: WikiSection[] = [];
  const lines = wikitext.split('\n');
  let index = 0;
  for (const line of lines) {
    const match = line.match(/^(={2,4})\s*([^=]+?)\s*\1\s*$/);
    if (match) {
      index++;
      const name = match[2].trim();
      const level = match[1].length;
      if (level === 2 && DIARY_SECTIONS.some(s => name.toLowerCase().includes(s))) {
        sections.push({ index, name: `${name} Rewards` });
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
      // Only break if we hit another top-level (==) section
      if (inSection && match[1].length <= sectionLevel) break;
      if (currentIndex === targetIndex) {
        inSection = true;
        sectionLevel = match[1].length;
        continue;
      }
    }
    if (inSection) out.push(line);
  }
  return cleanWikitext(out.join('\n')) || 'No content available.';
}

//  Background

function StoneBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Image source={require('../assets/icons/osrs-bg-scale.png')} style={{ width, height }} resizeMode="cover" />
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject as any}>
        <Defs>
          <RadialGradient id="vigDiary" cx="50%" cy="45%" r="70%">
            <Stop offset="0%"   stopColor="#0d0900" stopOpacity="0.0" />
            <Stop offset="75%"  stopColor="#0d0900" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0d0900" stopOpacity="0.92" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#vigDiary)" />
      </Svg>
    </View>
  );
}

// Progress panel

function ProgressPanel({ completedCount, totalTiers }:
  { completedCount: number; totalTiers: number }) {
  const { width } = useWindowDimensions();
  const barW = width - 64;
  const pct = completedCount / totalTiers;

  const easyDone  = completedCount >= DIARIES.length ? DIARIES.length : Math.min(completedCount, DIARIES.length);

  return (
    <View style={pbStyles.container}>
      <View style={pbStyles.row}>
        <Text style={pbStyles.label}>Tiers Complete</Text>
        <Text style={pbStyles.value}>{completedCount} / {totalTiers}</Text>
      </View>
      <View style={[pbStyles.track, { width: barW }]}>
        <View style={[pbStyles.fill, { width: barW * pct }]} />
      </View>
      <View style={pbStyles.tierRow}>
        {(['Easy', 'Medium', 'Hard', 'Elite'] as Tier[]).map(tier => {
          const count = DIARIES.filter(d =>
            completedCount > 0 // placeholder — actual count from parent
          ).length;
          return (
            <View key={tier} style={[pbStyles.tierBadge, { borderColor: TIER_COLORS[tier] }]}>
              <Text style={[pbStyles.tierText, { color: TIER_COLORS[tier] }]}>{tier}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const pbStyles = StyleSheet.create({
  container: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, padding: 14, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontFamily: theme.fonts.display, fontSize: 13, color: theme.colors.parchmentDark, letterSpacing: 1, textTransform: 'uppercase', paddingTop: 2 },
  value: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.goldLight },
  track: { height: 8, backgroundColor: theme.colors.background, borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  fill: { height: '100%', backgroundColor: theme.colors.gold, borderRadius: 4 },
  tierRow: { flexDirection: 'row', gap: 8, marginTop: 5, marginBottom: 5 },
  tierBadge: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 20, paddingVertical: 6 },
  tierText: { fontFamily: theme.fonts.display, fontSize: 18, fontWeight: 'bold' },
});

// Expandable wiki section

function ExpandableSection({ title, wikiPage, sectionIndex }:
  { title: string; wikiPage: string; sectionIndex: number }) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!expanded && content === null) {
      setLoading(true);
      const wikitext = await fetchDiaryWikitext(wikiPage);
      setContent(extractSection(wikitext, sectionIndex));
      setLoading(false);
    }
    setExpanded(v => !v);
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
  content: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchmentDim, lineHeight: 26 },
});

// Diary Detail Panel

type DiaryDetailProps = {
  diary: Diary;
  completedTiers: Set<string>;
  onToggleTier: (tier: Tier) => void;
};

function DiaryDetailPanel({ diary, completedTiers, onToggleTier }: DiaryDetailProps) {
  const [sections, setSections] = useState<WikiSection[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);

  useEffect(() => {
    setSections([]);
    setLoadingSections(true);
    fetchDiaryWikitext(diary.wikiPage).then((wikitext) => {
      setSections(parseDiarySections(wikitext));
      setLoadingSections(false);
    });
  }, [diary.wikiPage]);

  return (
    <View style={ddStyles.container}>
      {/* Header */}
      <View style={ddStyles.header}>
        <Image source={require('../assets/icons/achievement-icon.png')} style={ddStyles.icon} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={ddStyles.name}>{diary.name}</Text>
          <Text style={ddStyles.area}>{diary.area}</Text>
          <Text style={ddStyles.taskmaster}>Taskmaster: {diary.taskmaster}</Text>
        </View>
      </View>

      {/* Tier completion buttons */}
      <View style={ddStyles.tiersContainer}>
        <View style={ddStyles.sectionsDivider}>
          <View style={ddStyles.dividerLine} />
          <View style={ddStyles.diamond} />
          <Text style={ddStyles.dividerLabel}>TIERS</Text>
          <View style={ddStyles.diamond} />
          <View style={ddStyles.dividerLine} />
        </View>
        {diary.tiers.map(t => {
          const key = tierKey(diary, t.tier);
          const done = completedTiers.has(key);
          const color = TIER_COLORS[t.tier];
          return (
            <View key={t.tier} style={[ddStyles.tierCard, { borderColor: done ? theme.colors.greenLight : color + '60' }]}>
              <View style={ddStyles.tierCardTop}>
                <View style={[ddStyles.tierBadge, { borderColor: color }]}>
                  <Text style={[ddStyles.tierBadgeText, { color }]}>{t.tier}</Text>
                </View>
                <Text style={ddStyles.tierTasks}>{t.tasks} tasks</Text>
                <Text style={ddStyles.tierTopSkill}>{t.topSkill}</Text>
              </View>
              <Text style={ddStyles.tierReward}>{t.reward}</Text>
              <TouchableOpacity
                style={[ddStyles.tierBtn, done && ddStyles.tierBtnDone]}
                onPress={() => onToggleTier(t.tier)}
              >
                <Text style={[ddStyles.tierBtnText, done && ddStyles.tierBtnTextDone]}>
                  {done ? '✓ Completed' : 'Mark Complete'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Wiki sections */}
      {loadingSections ? (
        <View style={ddStyles.loadingRow}>
          <ActivityIndicator color={theme.colors.gold} size="small" />
          <Text style={ddStyles.loadingText}>Loading diary guide from wiki…</Text>
        </View>
      ) : sections.length > 0 ? (
        <View>
          <View style={ddStyles.sectionsDivider}>
            <View style={ddStyles.dividerLine} />
            <View style={ddStyles.diamond} />
            <Text style={ddStyles.dividerLabel}>WIKI GUIDE</Text>
            <View style={ddStyles.diamond} />
            <View style={ddStyles.dividerLine} />
          </View>
          {sections.map(s => (
            <ExpandableSection
              key={s.index}
              title={s.name}
              wikiPage={diary.wikiPage}
              sectionIndex={s.index}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const ddStyles = StyleSheet.create({
  container: { backgroundColor: theme.colors.panel, borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 4, padding: 14, gap: 14 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 36, height: 36, marginTop: 2 },
  name: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.parchment, includeFontPadding: false },
  area: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.textMuted, marginTop: 2 },
  taskmaster: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.parchmentDark, marginTop: 2 },
  tiersContainer: { gap: 8 },
  tierCard: { backgroundColor: theme.colors.background, borderWidth: 1, borderRadius: 4, padding: 12, gap: 8 },
  tierCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierBadge: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 5 },
  tierBadgeText: { fontFamily: theme.fonts.display, fontSize: 16, fontWeight: 'bold' },
  tierTasks: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchmentDark },
  tierTopSkill: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.textMuted, flex: 1, textAlign: 'right' },
  tierReward: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.parchmentDim, lineHeight: 28 },
  tierBtn: { borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 4, paddingVertical: 10, alignItems: 'center', backgroundColor: theme.colors.panel },
  tierBtnDone: { backgroundColor: theme.colors.green, borderColor: theme.colors.greenLight },
  tierBtnText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.goldLight, fontWeight: 'bold' },
  tierBtnTextDone: { color: theme.colors.white },
  sectionsDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  diamond: { width: 5, height: 5, backgroundColor: theme.colors.gold, transform: [{ rotate: '45deg' }] },
  dividerLabel: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.goldDim, letterSpacing: 2 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.textMuted },
});

// Diary row

function DiaryRow({ diary, completedTiers, onPress, selected }:
  { diary: Diary; completedTiers: Set<string>; onPress: () => void; selected: boolean }) {
  const tiers: Tier[] = ['Easy', 'Medium', 'Hard', 'Elite'];
  const completedCount = tiers.filter(t => completedTiers.has(tierKey(diary, t))).length;
  const allDone = completedCount === 4;

  return (
    <TouchableOpacity style={[drStyles.row, selected && drStyles.rowSelected]} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={[drStyles.name, allDone && drStyles.nameDone]}>{diary.name}</Text>
        <View style={drStyles.tierPips}>
          {tiers.map(t => {
            const done = completedTiers.has(tierKey(diary, t));
            return (
              <View key={t} style={[drStyles.pip, { backgroundColor: done ? TIER_COLORS[t] : theme.colors.border }]}>
                <Text style={drStyles.pipText}>{t[0]}</Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={drStyles.right}>
        <Text style={drStyles.progress}>{completedCount}/4</Text>
        <Text style={drStyles.area}>{diary.area}</Text>
      </View>
    </TouchableOpacity>
  );
}

const drStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 10 },
  rowSelected: { backgroundColor: theme.colors.panelLight },
  name: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchment, marginBottom: 6 },
  nameDone: { color: theme.colors.parchmentDark },
  tierPips: { flexDirection: 'row', gap: 4 },
  pip: { width: 22, height: 18, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  pipText: { fontFamily: theme.fonts.display, fontSize: 12, color: theme.colors.white, fontWeight: 'bold' },
  right: { alignItems: 'flex-end', gap: 4 },
  progress: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.goldLight },
  area: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.textMuted },
});

// Filter bar

type DiaryFilter = 'All' | 'Easy' | 'Medium' | 'Hard' | 'Elite' | 'Complete' | 'Incomplete';

function FilterBar({ active, onChange }: { active: DiaryFilter; onChange: (f: DiaryFilter) => void }) {
  const filters: DiaryFilter[] = ['All', 'Easy', 'Medium', 'Hard', 'Elite', 'Complete', 'Incomplete'];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            style={[fbStyles.chip, active === f && fbStyles.chipActive,
              (f === 'Easy' || f === 'Medium' || f === 'Hard' || f === 'Elite') && active === f
                ? { borderColor: TIER_COLORS[f as Tier] } : {}
            ]}
            onPress={() => onChange(f)}
          >
            <Text style={[fbStyles.text, active === f && fbStyles.textActive,
              (f === 'Easy' || f === 'Medium' || f === 'Hard' || f === 'Elite') && active === f
                ? { color: TIER_COLORS[f as Tier] } : {}
            ]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const fbStyles = StyleSheet.create({
  chip: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 3, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.panel },
  chipActive: { borderColor: theme.colors.borderGold, backgroundColor: theme.colors.panelLight },
  text: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.parchmentDim },
  textActive: { color: theme.colors.goldLight },
});

// Main Screen

export default function AchievementDiariesScreen() {
  const router = useRouter();
  const [completedTiers, setCompletedTiers] = useState<Set<string>>(new Set());
  const [activeUsername, setActiveUsername] = useState<string | null>(null);
  const [progressKey, setProgressKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<DiaryFilter>('All');
  const [selectedDiary, setSelectedDiary] = useState<Diary | null>(null);

  const reloadCompleted = useCallback(async () => {
    await migrateToPerCharacterProgress();
    const key = await getActiveProgressKey();
    const username = await getActiveCharacterUsername();
    setProgressKey(key);
    setActiveUsername(username);
    if (!key) {
      setCompletedTiers(new Set());
      return;
    }
    setCompletedTiers(await loadDiaryCompletions(key));
  }, []);

  useFocusEffect(useCallback(() => {
    reloadCompleted();
  }, [reloadCompleted]));

  const handleCharacterChange = useCallback(async (username: string) => {
    await setActiveCharacterByUsername(username);
    await reloadCompleted();
  }, [reloadCompleted]);

  const toggleTier = useCallback(async (diary: Diary, tier: Tier) => {
    if (!progressKey) {
      Alert.alert('Select a character', 'Choose a saved character in WikiSync below before marking diaries.');
      return;
    }
    const key = tierKey(diary, tier);
    setCompletedTiers(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveDiaryCompletions(progressKey, next);
      return next;
    });
  }, [progressKey]);

  const filteredDiaries = DIARIES.filter(d => {
    if (searchQuery && !d.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !d.area.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filter === 'Complete')   return ['Easy','Medium','Hard','Elite'].every(t => completedTiers.has(tierKey(d, t as Tier)));
    if (filter === 'Incomplete') return !['Easy','Medium','Hard','Elite'].every(t => completedTiers.has(tierKey(d, t as Tier)));
    if (filter === 'Easy')   return !completedTiers.has(tierKey(d, 'Easy'));
    if (filter === 'Medium') return completedTiers.has(tierKey(d, 'Easy')) && !completedTiers.has(tierKey(d, 'Medium'));
    if (filter === 'Hard')   return completedTiers.has(tierKey(d, 'Medium')) && !completedTiers.has(tierKey(d, 'Hard'));
    if (filter === 'Elite')  return completedTiers.has(tierKey(d, 'Hard')) && !completedTiers.has(tierKey(d, 'Elite'));
    return true;
  });

  const completedCount = [...completedTiers].length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
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
              <Text style={styles.screenTitle}>Achievement Diaries</Text>
              <View style={styles.taglineRow}>
                <View style={styles.ornamentLine} />
                <Text style={styles.ornamentSymbol}>✦</Text>
                <Text style={styles.screenSubtitle}>12 Regions · 48 Tiers</Text>
                <Text style={styles.ornamentSymbol}>✦</Text>
                <View style={styles.ornamentLine} />
              </View>
            </View>

            {/* Progress */}
            <View style={styles.section}>
              {activeUsername ? (
                <Text style={styles.activeCharacter}>Tracking: {activeUsername}</Text>
              ) : (
                <Text style={styles.activeCharacterMuted}>Select a character in WikiSync to track progress</Text>
              )}
              <ProgressPanel completedCount={completedCount} totalTiers={TOTAL_TIERS} />
            </View>

            <View style={styles.section}>
              <WikiSyncPanel
                compact
                questNames={[]}
                syncTargets={['diaries']}
                onSynced={reloadCompleted}
                onCharacterChange={handleCharacterChange}
              />
            </View>

            {/* Diary detail */}
            {selectedDiary && (
              <View style={styles.section}>
                <TouchableOpacity style={styles.backToCats} onPress={() => setSelectedDiary(null)}>
                  <Text style={styles.backToCatsText}>← Back to list</Text>
                </TouchableOpacity>
                <View style={styles.sectionHeader}>
                  <View style={styles.ornamentLine} />
                  <View style={styles.diamond} />
                  <Text style={styles.sectionTitle}>Diary Detail</Text>
                  <View style={styles.diamond} />
                  <View style={styles.ornamentLine} />
                </View>
                <DiaryDetailPanel
                  diary={selectedDiary}
                  completedTiers={completedTiers}
                  onToggleTier={(tier) => toggleTier(selectedDiary, tier)}
                />
              </View>
            )}

            {/* Diary list */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.ornamentLine} />
                <View style={styles.diamond} />
                <Text style={styles.sectionTitle}>All Diaries</Text>
                <View style={styles.diamond} />
                <View style={styles.ornamentLine} />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search diaries…"
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              <FilterBar active={filter} onChange={setFilter} />
              <Text style={styles.count}>{filteredDiaries.length} diaries</Text>
              <View style={styles.diaryList}>
                {filteredDiaries.map(d => (
                  <DiaryRow
                    key={d.name}
                    diary={d}
                    completedTiers={completedTiers}
                    selected={selectedDiary?.name === d.name}
                    onPress={() => {
                      setSelectedDiary(selectedDiary?.name === d.name ? null : d);
                      Keyboard.dismiss();
                    }}
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
  screenTitle: { fontFamily: theme.fonts.display, fontSize: 34, color: theme.colors.gold, letterSpacing: 1, textShadowColor: 'rgba(200,160,48,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12, includeFontPadding: false, lineHeight: 42, textAlign: 'center' },
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  diamond: { width: 6, height: 6, backgroundColor: theme.colors.gold, transform: [{ rotate: '45deg' }], flexShrink: 0 },
  sectionTitle: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight, letterSpacing: 2, textTransform: 'uppercase', includeFontPadding: false },

  searchInput: { borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 3, backgroundColor: theme.colors.background, paddingHorizontal: 14, paddingVertical: 12, fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchment, marginBottom: 4 },
  count: { fontFamily: theme.fonts.display, fontSize: 13, color: theme.colors.textMuted, marginBottom: 6, letterSpacing: 1, paddingTop: 10 },
  diaryList: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, backgroundColor: theme.colors.panel, overflow: 'hidden' },

  backToCats: { marginBottom: 10 },
  backToCatsText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.gold },
});
