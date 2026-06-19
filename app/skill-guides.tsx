import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, ImageSourcePropType, useWindowDimensions,
} from 'react-native';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../constants/theme';

// Wiki training guide page URLs
// Each skill has members + F2P variants where applicable

type SkillName =
  | 'Attack' | 'Defence' | 'Strength' | 'Hitpoints' | 'Ranged'
  | 'Prayer' | 'Magic' | 'Cooking' | 'Woodcutting' | 'Fletching'
  | 'Fishing' | 'Firemaking' | 'Crafting' | 'Smithing' | 'Mining'
  | 'Herblore' | 'Agility' | 'Thieving' | 'Slayer' | 'Farming'
  | 'Runecraft' | 'Hunter' | 'Construction' | 'Sailing';

type GuideVariant = { label: string; wikiPage: string };

const SKILL_GUIDES: Record<SkillName, GuideVariant[]> = {
  Attack:       [{ label: 'Members',     wikiPage: 'Pay-to-play_melee_training' },
                 { label: 'F2P',         wikiPage: 'Free-to-play_melee_training' }],
  Strength:     [{ label: 'Members',     wikiPage: 'Pay-to-play_melee_training' },
                 { label: 'F2P',         wikiPage: 'Free-to-play_melee_training' }],
  Defence:      [{ label: 'Members',     wikiPage: 'Defence_training' },
                 { label: 'F2P',         wikiPage: 'Free-to-play_melee_training' }],
  Hitpoints:    [{ label: 'Members',     wikiPage: 'Pay-to-play_melee_training' },
                 { label: 'F2P',         wikiPage: 'Free-to-play_melee_training' }],
  Ranged:       [{ label: 'Members',     wikiPage: 'Pay-to-play_Ranged_training' },
                 { label: 'F2P',         wikiPage: 'Free-to-play_Ranged_training' }],
  Prayer:       [{ label: 'Members',     wikiPage: 'Pay-to-play_Prayer_training' },
                 { label: 'F2P',         wikiPage: 'Free-to-play_Prayer_training' }],
  Magic:        [{ label: 'Members',     wikiPage: 'Pay-to-play_Magic_training' },
                 { label: 'F2P',         wikiPage: 'Free-to-play_Magic_training' }],
  Mining:       [{ label: 'Members',     wikiPage: 'Pay-to-play_Mining_training' },
                 { label: 'F2P',         wikiPage: 'Free-to-play_Mining_training' }],
  Woodcutting:  [{ label: 'Members',     wikiPage: 'Pay-to-play_Woodcutting_training' },
                 { label: 'F2P',         wikiPage: 'Free-to-play_Woodcutting_training' }],
  Fishing:      [{ label: 'Members',     wikiPage: 'Pay-to-play_Fishing_training' },
                 { label: 'F2P',         wikiPage: 'Free-to-play_Fishing_training' }],
  Cooking:      [{ label: 'Members',     wikiPage: 'Pay-to-play_Cooking_training' },
                 { label: 'F2P',         wikiPage: 'Free-to-play_Cooking_training' }],
  Smithing:     [{ label: 'Members',     wikiPage: 'Pay-to-play_Smithing_training' },
                 { label: 'F2P',         wikiPage: 'Free-to-play_Smithing_training' }],
  Firemaking:   [{ label: 'Members',     wikiPage: 'Pay-to-play_Firemaking_training' },
                 { label: 'F2P',         wikiPage: 'Free-to-play_Firemaking_training' }],
  Crafting:     [{ label: 'Members',     wikiPage: 'Pay-to-play_Crafting_training' },
                 { label: 'F2P',         wikiPage: 'Free-to-play_Crafting_training' }],
  Runecraft:    [{ label: 'Members',     wikiPage: 'Pay-to-play_Runecraft_training' },
                 { label: 'F2P',         wikiPage: 'Free-to-play_Runecraft_training' }],
  Herblore:     [{ label: 'Members',     wikiPage: 'Herblore_training' }],
  Agility:      [{ label: 'Members',     wikiPage: 'Agility_training' }],
  Thieving:     [{ label: 'Members',     wikiPage: 'Thieving_training' }],
  Slayer:       [{ label: 'Members',     wikiPage: 'Slayer_training' }],
  Farming:      [{ label: 'Members',     wikiPage: 'Farming_training' }],
  Fletching:    [{ label: 'Members',     wikiPage: 'Fletching_training' }],
  Hunter:       [{ label: 'Members',     wikiPage: 'Hunter_training' }],
  Construction: [{ label: 'Members',     wikiPage: 'Construction_training' }],
  Sailing:      [{ label: 'Members',     wikiPage: 'Sailing_training' }],
};

const SKILL_ORDER: SkillName[] = [
  'Attack', 'Hitpoints', 'Mining',
  'Strength', 'Agility', 'Smithing',
  'Defence', 'Herblore', 'Fishing',
  'Ranged', 'Thieving', 'Cooking',
  'Prayer', 'Crafting', 'Firemaking',
  'Magic', 'Fletching', 'Woodcutting',
  'Runecraft', 'Slayer', 'Farming',
  'Construction', 'Hunter', 'Sailing',
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

// Wiki API

const WIKI_API = 'https://oldschool.runescape.wiki/api.php';
const UA = 'AdventurersLog-App/1.0';

type WikiSection = { index: number; title: string; level: number };

const _wikitextCache: Record<string, string> = {};
const _sectionsCache: Record<string, WikiSection[]> = {};

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

async function fetchWikiSections(wikiPage: string): Promise<WikiSection[]> {
  if (_sectionsCache[wikiPage]) return _sectionsCache[wikiPage];
  try {
    const url = `${WIKI_API}?action=query&prop=revisions&rvprop=content&rvslots=*&titles=${encodeURIComponent(wikiPage)}&format=json&origin=*`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const data = await res.json();
    const pages = data?.query?.pages ?? {};
    const page = Object.values(pages)[0] as any;
    const wikitext = extractWikitext(page);
    if (!wikitext) return [];

    _wikitextCache[wikiPage] = wikitext;

    const sections: WikiSection[] = [];
    const lines = wikitext.split('\n');
    let index = 0;
    for (const line of lines) {
      const match = line.match(/^(={2,4})\s*([^=]+?)\s*\1\s*$/);
      if (match) {
        index++;
        sections.push({ index, title: match[2].trim(), level: match[1].length });
      }
    }
    _sectionsCache[wikiPage] = sections;
    return sections;
  } catch { return []; }
}

async function fetchSectionContent(wikiPage: string, sectionIndex: number): Promise<string> {
  let wikitext = _wikitextCache[wikiPage];
  if (!wikitext) {
    try {
      const url = `${WIKI_API}?action=query&prop=revisions&rvprop=content&rvslots=*&titles=${encodeURIComponent(wikiPage)}&format=json&origin=*`;
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      const data = await res.json();
      const pages = data?.query?.pages ?? {};
      const page = Object.values(pages)[0] as any;
      wikitext = extractWikitext(page);
      _wikitextCache[wikiPage] = wikitext;
    } catch { return 'Could not load content.'; }
  }

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
      if (currentIndex === sectionIndex) {
        inSection = true;
        sectionLevel = match[1].length;
        continue;
      }
    }
    if (inSection) out.push(line);
  }

  return cleanWikitext(out.join('\n')) || 'No content available for this section.';
}

// Background

function StoneBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Image source={require('../assets/icons/osrs-bg-scale.png')} style={{ width, height }} resizeMode="cover" />
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject as any}>
        <Defs>
          <RadialGradient id="vigSkillGuide" cx="50%" cy="45%" r="70%">
            <Stop offset="0%"   stopColor="#0d0900" stopOpacity="0.0" />
            <Stop offset="75%"  stopColor="#0d0900" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0d0900" stopOpacity="0.92" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#vigSkillGuide)" />
      </Svg>
    </View>
  );
}

// Expandable wiki section

function WikiSectionRow({ wikiPage, section }: { wikiPage: string; section: WikiSection }) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!expanded && content === null) {
      setLoading(true);
      const text = await fetchSectionContent(wikiPage, section.index);
      setContent(text);
      setLoading(false);
    }
    setExpanded(v => !v);
  };

  const indent = section.level > 2;

  return (
    <View style={[wsStyles.wrapper, indent && wsStyles.wrapperIndent]}>
      <TouchableOpacity style={[wsStyles.header, indent && wsStyles.headerIndent]} onPress={toggle}>
        <Text style={[wsStyles.title, indent && wsStyles.titleIndent]} numberOfLines={2}>{section.title}</Text>
        {loading
          ? <ActivityIndicator color={theme.colors.gold} size="small" />
          : <Text style={wsStyles.chevron}>{expanded ? '▾' : '▸'}</Text>
        }
      </TouchableOpacity>
      {expanded && content !== null && (
        <View style={wsStyles.body}>
          <Text style={wsStyles.content}>{content}</Text>
        </View>
      )}
    </View>
  );
}

const wsStyles = StyleSheet.create({
  wrapper: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  wrapperIndent: { marginLeft: 12, borderColor: theme.colors.border },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 13, backgroundColor: theme.colors.panelLight },
  headerIndent: { backgroundColor: theme.colors.panel, paddingVertical: 10 },
  title: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.parchment, flex: 1, paddingRight: 8 },
  titleIndent: { fontSize: 18, color: theme.colors.parchmentDim },
  chevron: { color: theme.colors.gold, fontSize: 20 },
  body: { backgroundColor: theme.colors.background, padding: 12 },
  content: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchmentDim, lineHeight: 30 },
});

// Skill guide panel

type SkillGuidePanelProps = {
  skill: SkillName;
  myLevel?: number;
};

function SkillGuidePanel({ skill, myLevel }: SkillGuidePanelProps) {
  const variants = SKILL_GUIDES[skill];
  const [activeVariant, setActiveVariant] = useState(0);
  const [sections, setSections] = useState<WikiSection[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);

  const wikiPage = variants[activeVariant]?.wikiPage ?? '';

  useEffect(() => {
    setSections([]);
    setLoadingSections(true);
    fetchWikiSections(wikiPage).then(s => {
      setSections(s);
      setLoadingSections(false);
    });
  }, [wikiPage]);

  return (
    <View style={sgStyles.container}>
      {/* Skill header */}
      <View style={sgStyles.header}>
        <Image source={SKILL_ICONS[skill]} style={sgStyles.icon} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={sgStyles.skillName}>{skill} Training</Text>
          {myLevel !== undefined && (
            <Text style={sgStyles.levelText}>Your level: {myLevel}</Text>
          )}
        </View>
        {myLevel !== undefined && (
          <View style={[sgStyles.levelBadge, myLevel >= 99 && sgStyles.levelBadgeMaxed]}>
            <Text style={[sgStyles.levelBadgeNum, myLevel >= 99 && sgStyles.levelBadgeNumMaxed]}>
              {myLevel}
            </Text>
          </View>
        )}
      </View>

      {/* Level progress bar */}
      {myLevel !== undefined && (
        <View style={sgStyles.xpBar}>
          <View style={[sgStyles.xpFill, { width: `${Math.min((myLevel / 99) * 100, 100)}%` as any }]} />
        </View>
      )}

      {/* Variant tabs (Members / F2P) */}
      {variants.length > 1 && (
        <View style={sgStyles.variantRow}>
          {variants.map((v, i) => (
            <TouchableOpacity
              key={v.label}
              style={[sgStyles.variantChip, activeVariant === i && sgStyles.variantChipActive]}
              onPress={() => setActiveVariant(i)}
            >
              <Text style={[sgStyles.variantText, activeVariant === i && sgStyles.variantTextActive]}>
                {v.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Wiki sections */}
      <View style={sgStyles.sectionsDivider}>
        <View style={sgStyles.divLine} />
        <View style={sgStyles.diamond} />
        <Text style={sgStyles.divLabel}>TRAINING GUIDE</Text>
        <View style={sgStyles.diamond} />
        <View style={sgStyles.divLine} />
      </View>

      {loadingSections ? (
        <View style={sgStyles.loadingRow}>
          <ActivityIndicator color={theme.colors.gold} />
          <Text style={sgStyles.loadingText}>Loading guide from wiki…</Text>
        </View>
      ) : sections.length === 0 ? (
        <Text style={sgStyles.emptyText}>No guide sections found.</Text>
      ) : (
        <View style={sgStyles.sections}>
          {sections.map((s) => (
            <WikiSectionRow key={`${wikiPage}-${s.index}`} wikiPage={wikiPage} section={s} />
          ))}
        </View>
      )}

      {/* Wiki attribution */}
      <Text style={sgStyles.attribution}>
        Content obtained from the OSRS Wiki ({wikiPage.replace(/_/g, ' ')})
      </Text>
    </View>
  );
}

const sgStyles = StyleSheet.create({
  container: { backgroundColor: theme.colors.panel, borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 4, padding: 14, gap: 12, marginBottom: 16 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  icon: { width: 40, height: 40 },
  skillName: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.parchment, includeFontPadding: false },
  levelText: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.textMuted, marginTop: 2 },
  levelBadge: { width: 48, height: 48, borderRadius: 4, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.borderGold, alignItems: 'center', justifyContent: 'center' },
  levelBadgeMaxed: { borderColor: '#ffd700', backgroundColor: 'rgba(255,215,0,0.1)' },
  levelBadgeNum: { fontFamily: theme.fonts.display, fontSize: 25, color: theme.colors.goldLight, includeFontPadding: false },
  levelBadgeNumMaxed: { color: '#ffd700' },
  xpBar: { height: 6, backgroundColor: theme.colors.background, borderRadius: 3, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  xpFill: { height: '100%', backgroundColor: theme.colors.gold, borderRadius: 3 },
  variantRow: { flexDirection: 'row', gap: 8 },
  variantChip: { flex: 1, paddingVertical: 8, borderRadius: 3, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background, alignItems: 'center' },
  variantChipActive: { borderColor: theme.colors.borderGold, backgroundColor: theme.colors.panelLight },
  variantText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchmentDim },
  variantTextActive: { color: theme.colors.goldLight },
  sectionsDivider: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  divLine: { flex: 1, height: 1, backgroundColor: theme.colors.border, marginTop: 10, marginBottom: 10 },
  diamond: { width: 5, height: 5, backgroundColor: theme.colors.gold, marginTop: 10, marginBottom: 10, transform: [{ rotate: '45deg' }] },
  divLabel: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.goldDim, letterSpacing: 2, marginTop: 10, marginBottom: 10 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  loadingText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.textMuted },
  emptyText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.textMuted, fontStyle: 'italic' },
  sections: { gap: 0 },
  attribution: { fontFamily: theme.fonts.display, fontSize: 11, color: theme.colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: 4 },
});

// Skill grid cell 

function SkillCell({ skill, level, selected, onPress }:
  { skill: SkillName; level?: number; selected: boolean; onPress: () => void }) {
  const isMaxed = level !== undefined && level >= 99;
  return (
    <TouchableOpacity
      style={[styles.skillCell, selected && styles.skillCellSelected, isMaxed && styles.skillCellMaxed]}
      onPress={onPress}
    >
      <Image source={SKILL_ICONS[skill]} style={styles.skillIcon} resizeMode="contain" />
      <Text style={[styles.skillLevel, isMaxed && styles.skillLevelMaxed]}>
        {level ?? '—'}
      </Text>
      <Text style={styles.skillName} numberOfLines={1}>{skill}</Text>
    </TouchableOpacity>
  );
}

// Main Screen

type Character = { id: string; username: string; lastSnapshot?: Record<SkillName, { level: number; xp: number }> };

export default function SkillGuidesScreen() {
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillName | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('adventurers_log_characters').then((raw) => {
      if (!raw) return;
      try {
        const chars: Character[] = JSON.parse(raw);
        setCharacters(chars);
        if (chars.length > 0) setActiveCharId(chars[0].id);
      } catch {}
    });
  }, []);

  const activeChar = characters.find(c => c.id === activeCharId) ?? null;
  const getLevel = (skill: SkillName) => activeChar?.lastSnapshot?.[skill]?.level;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
          <Text style={styles.screenTitle}>Skill Guides</Text>
          <View style={styles.taglineRow}>
            <View style={styles.ornamentLine} />
            <Text style={styles.ornamentSymbol}>✦</Text>
            <Text style={styles.screenSubtitle}>Training Methods & XP Rates</Text>
            <Text style={styles.ornamentSymbol}>✦</Text>
            <View style={styles.ornamentLine} />
          </View>
        </View>

        {/* Character selector */}
        {characters.length > 0 && (
          <View style={styles.charRow}>
            <Text style={styles.charLabel}>Showing levels for:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {characters.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.charChip, c.id === activeCharId && styles.charChipActive]}
                    onPress={() => setActiveCharId(c.id)}
                  >
                    <Text style={[styles.charChipText, c.id === activeCharId && styles.charChipTextActive]}>
                      {c.username}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Guide panel — shown above grid when skill selected */}
        {selectedSkill && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.backToCats} onPress={() => setSelectedSkill(null)}>
              <Text style={styles.backToCatsText}>← Back to skills</Text>
            </TouchableOpacity>
            <SkillGuidePanel skill={selectedSkill} myLevel={getLevel(selectedSkill)} />
          </View>
        )}

        {/* Skills grid */}
        <View style={styles.section}>

          <Text style={styles.gridHint}>Tap any skill to load its training guide from the wiki!</Text>
          <View style={styles.skillsGrid}>
            {SKILL_ORDER.map((skill) => (
              <SkillCell
                key={skill}
                skill={skill}
                level={getLevel(skill)}
                selected={selectedSkill === skill}
                onPress={() => setSelectedSkill(selectedSkill === skill ? null : skill)}
              />
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },

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

  charRow: { marginBottom: 14, gap: 6 },
  charLabel: { fontFamily: theme.fonts.display, fontSize: 12, color: theme.colors.textMuted, letterSpacing: 1 },
  charChip: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 3, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: theme.colors.panel, marginBottom: 5 },
  charChipActive: { borderColor: theme.colors.borderGold, backgroundColor: theme.colors.panelLight },
  charChipText: { fontFamily: theme.fonts.display, fontSize: 13, color: theme.colors.parchmentDim },
  charChipTextActive: { color: theme.colors.goldLight },

  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  diamond: { width: 6, height: 6, backgroundColor: theme.colors.gold, transform: [{ rotate: '45deg' }], flexShrink: 0 },
  sectionTitle: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight, letterSpacing: 2, textTransform: 'uppercase', includeFontPadding: false },

  gridHint: { fontFamily: theme.fonts.display, fontSize: 18, textAlign: 'center', color: theme.colors.textMuted, marginBottom: 20 },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  skillCell: { width: '30%', backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center', gap: 4 },
  skillCellSelected: { borderColor: theme.colors.borderGold, backgroundColor: theme.colors.panelLight },
  skillCellMaxed: { borderColor: '#ffd700' },
  skillIcon: { width: 30, height: 30 },
  skillLevel: { fontFamily: theme.fonts.display, fontSize: 24, color: theme.colors.parchment, includeFontPadding: false },
  skillLevelMaxed: { color: '#ffd700' },
  skillName: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.parchmentDark, textAlign: 'center', includeFontPadding: false },

  backToCats: { marginBottom: 20, },
  backToCatsText: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.gold },
});
