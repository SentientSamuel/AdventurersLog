import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Image, ActivityIndicator, useWindowDimensions, Keyboard,
  KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '../constants/theme';

const WIKI_API = 'https://oldschool.runescape.wiki/api.php';
const UA = 'AdventurersLog-App/1.0';

//  Monster categories
const MONSTER_CATEGORIES: { label: string; image: any; wikiCategory: string; description: string }[] = [
  { label: 'Bosses',          image: require('../assets/icons/bestiary/bosses.png'),       wikiCategory: 'Bosses',                   description: 'Powerful solo & raid bosses' },
  { label: 'Slayer',          image: require('../assets/icons/bestiary/slayer.png'),       wikiCategory: 'Slayer monsters',           description: 'Assignable slayer creatures' },
  { label: 'Dragons',         image: require('../assets/icons/bestiary/dragons.png'),      wikiCategory: 'Dragons',                  description: 'Chromatic, metallic & more' },
  { label: 'Demons',          image: require('../assets/icons/bestiary/demons.png'),       wikiCategory: 'Demons',                   description: 'Lesser, greater & beyond' },
  { label: 'Giants',          image: require('../assets/icons/bestiary/giants.png'),       wikiCategory: 'Giants',                   description: 'Hill, moss, fire & frost' },
  { label: 'Undead',          image: require('../assets/icons/bestiary/undead.png'),       wikiCategory: 'Undead',                   description: 'Zombies, skeletons & ghosts' },
  { label: 'Wilderness',      image: require('../assets/icons/bestiary/wilderness.png'),   wikiCategory: 'Wilderness monsters',       description: 'PvM & PvP threats' },
  { label: 'Gods & Generals', image: require('../assets/icons/bestiary/gods.png'),         wikiCategory: 'God Wars Dungeon monsters', description: 'GWD factions' },
  { label: 'Kalphites',       image: require('../assets/icons/bestiary/kalphites.png'),    wikiCategory: 'Kalphites',                description: 'Desert insectoids' },
  { label: 'Sea Creatures',   image: require('../assets/icons/bestiary/sea-creatures.png'),wikiCategory: 'Sea creatures',            description: 'Aquatic monsters' },
  { label: 'Vampyres',        image: require('../assets/icons/bestiary/vampyres.png'),     wikiCategory: 'Vampyres',                 description: 'Morytania bloodsuckers' },
];

// Types 

type MonsterSummary = {
  title: string;
  pageid: number;
};

type MonsterDetail = {
  name: string;
  examine?: string;
  combat?: number;
  hitpoints?: number;
  maxHit?: number;
  attackStyle?: string;
  attackSpeed?: number;
  aggressive?: boolean;
  poisonous?: boolean;
  members?: boolean;
  slayerLevel?: number;
  slayerXP?: number;
  assignedBy?: string;
  location?: string;
  defenceStab?: number;
  defenceSlash?: number;
  defenceCrush?: number;
  defenceMagic?: number;
  defenceRanged?: number;
  attackStab?: number;
  attackSlash?: number;
  attackCrush?: number;
  attackMagic?: number;
  attackRanged?: number;
  imageUrl?: string;
};

//  API helpers

async function searchMonsters(query: string): Promise<MonsterSummary[]> {
  try {
    const url = `${WIKI_API}?action=opensearch&search=${encodeURIComponent(query)}&limit=12&format=json&origin=*`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const data = await res.json();
    const titles: string[] = data[1] ?? [];
    return titles.map((title, i) => ({ title, pageid: i }));
  } catch { return []; }
}

async function fetchCategoryMonsters(category: string): Promise<MonsterSummary[]> {
  try {
    const url = `${WIKI_API}?action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(category)}&cmlimit=50&cmtype=page&format=json&origin=*`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const data = await res.json();
    const members = data?.query?.categorymembers ?? [];
    return members.map((m: any) => ({ title: m.title, pageid: m.pageid }));
  } catch { return []; }
}

function parseInfoboxValue(wikitext: string, key: string): string | null {
  const regex = new RegExp(`\\|\\s*${key}\\s*=\\s*([^|\\n}]+)`);
  const match = wikitext.match(regex);
  return match ? match[1].replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1').replace(/<[^>]+>/g, '').trim() : null;
}

function parseInfoboxNumber(wikitext: string, key: string): number | undefined {
  const val = parseInfoboxValue(wikitext, key);
  if (!val) return undefined;
  const n = parseInt(val.replace(/,/g, ''));
  return isNaN(n) ? undefined : n;
}

async function fetchMonsterDetail(title: string): Promise<MonsterDetail | null> {
  try {
    const [wikitextRes, imageRes] = await Promise.all([
      fetch(`${WIKI_API}?action=query&prop=revisions&rvprop=content&rvslots=*&titles=${encodeURIComponent(title)}&format=json&origin=*`, { headers: { 'User-Agent': UA } }),
      fetch(`${WIKI_API}?action=query&titles=File:${encodeURIComponent(title.replace(/ /g, '_'))}.png&prop=imageinfo&iiprop=url&format=json&origin=*`, { headers: { 'User-Agent': UA } }),
    ]);

    const wikitextData = await wikitextRes.json();
    const pages = wikitextData?.query?.pages ?? {};
    const page = Object.values(pages)[0] as any;
    if (!page || page.missing) return null;
    const wikitext: string =
      page?.revisions?.[0]?.slots?.main?.['*'] ??
      page?.revisions?.[0]?.['*'] ?? '';

    const imageData = await imageRes.json();
    const imagePages = imageData?.query?.pages ?? {};
    const imagePage = Object.values(imagePages)[0] as any;
    const imageUrl = imagePage?.imageinfo?.[0]?.url ?? undefined;

    const rawLocation = parseInfoboxValue(wikitext, 'location');
    const location = rawLocation
      ? rawLocation
          .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2')
          .replace(/<[^>]+>/g, '')
          .replace(/\{\{.*?\}\}/gs, '')
          .replace(/\{\{.*/g, '')
          .replace(/\}\}.*/g, '')
          .replace(/'{2,3}/g, '')
          .replace(/\([^)]*\)?\s*$/g, '')
          .replace(/\(\s*,/g, ',')
          .replace(/\(\s*$/g, '')
          .replace(/\s*\(\s*$/g, '')
          .replace(/\s*,\s*/g, ', ')
          .replace(/\s{2,}/g, ' ')
          .trim()
      : undefined;

    return {
      name: title,
      examine:       parseInfoboxValue(wikitext, 'examine') ?? undefined,
      combat:        parseInfoboxNumber(wikitext, 'combat'),
      hitpoints:     parseInfoboxNumber(wikitext, 'hitpoints'),
      maxHit:        parseInfoboxNumber(wikitext, 'max hit'),
      attackStyle:   parseInfoboxValue(wikitext, 'attack style') ?? undefined,
      attackSpeed:   parseInfoboxNumber(wikitext, 'attack speed'),
      aggressive:    parseInfoboxValue(wikitext, 'aggressive')?.toLowerCase() === 'yes',
      poisonous:     parseInfoboxValue(wikitext, 'poisonous')?.toLowerCase() === 'yes',
      members:       parseInfoboxValue(wikitext, 'members')?.toLowerCase() === 'yes',
      slayerLevel:   parseInfoboxNumber(wikitext, 'slaylvl'),
      slayerXP:      parseInfoboxNumber(wikitext, 'slayxp'),
      assignedBy:    parseInfoboxValue(wikitext, 'assignedby') ?? undefined,
      location,
      defenceStab:   parseInfoboxNumber(wikitext, 'dstab'),
      defenceSlash:  parseInfoboxNumber(wikitext, 'dslash'),
      defenceCrush:  parseInfoboxNumber(wikitext, 'dcrush'),
      defenceMagic:  parseInfoboxNumber(wikitext, 'dmagic'),
      defenceRanged: parseInfoboxNumber(wikitext, 'drange'),
      attackStab:    parseInfoboxNumber(wikitext, 'astab'),
      attackSlash:   parseInfoboxNumber(wikitext, 'aslash'),
      attackCrush:   parseInfoboxNumber(wikitext, 'acrush'),
      attackMagic:   parseInfoboxNumber(wikitext, 'amagic'),
      attackRanged:  parseInfoboxNumber(wikitext, 'arange'),
      imageUrl,
    };
  } catch { return null; }
}

//  Background 

function StoneBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Image source={require('../assets/icons/osrs-bg-scale.png')} style={{ width, height }} resizeMode="cover" />
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject as any}>
        <Defs>
          <RadialGradient id="vigBestiary" cx="50%" cy="45%" r="70%">
            <Stop offset="0%"   stopColor="#0d0900" stopOpacity="0.0" />
            <Stop offset="75%"  stopColor="#0d0900" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0d0900" stopOpacity="0.92" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#vigBestiary)" />
      </Svg>
    </View>
  );
}

//  Stat Row 

function StatRow({ label, value }: { label: string; value: number | string }) {
  const numVal = typeof value === 'number' ? value : undefined;
  const color = numVal !== undefined
    ? (numVal > 0 ? theme.colors.greenLight : numVal < 0 ? theme.colors.redLight : theme.colors.parchmentDim)
    : theme.colors.parchment;
  const display = numVal !== undefined ? (numVal > 0 ? `+${numVal}` : `${numVal}`) : value;
  return (
    <View style={mStyles.statRow}>
      <Text style={mStyles.statLabel}>{label}</Text>
      <Text style={[mStyles.statValue, { color }]}>{display}</Text>
    </View>
  );
}

//  Monster Detail Panel 

function MonsterDetailPanel({ monster }: { monster: MonsterDetail }) {
  const hasCombat  = monster.hitpoints || monster.maxHit || monster.attackStyle;
  const hasDefence = monster.defenceStab !== undefined;
  const hasAttack  = monster.attackStab  !== undefined;
  const hasSlayer  = monster.slayerLevel || monster.slayerXP;

  return (
    <View style={mStyles.container}>
      <View style={mStyles.header}>
        {monster.imageUrl ? (
          <Image source={{ uri: monster.imageUrl }} style={mStyles.image} resizeMode="contain" />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={mStyles.name}>{monster.name}</Text>
          <View style={mStyles.tagRow}>
            {monster.members !== undefined && (
              <View style={mStyles.tag}>
                <Text style={mStyles.tagText}>{monster.members ? 'Members' : 'F2P'}</Text>
              </View>
            )}
            {monster.aggressive && (
              <View style={[mStyles.tag, mStyles.tagRed]}>
                <Text style={mStyles.tagText}>Aggressive</Text>
              </View>
            )}
            {monster.poisonous && (
              <View style={[mStyles.tag, mStyles.tagGreen]}>
                <Text style={mStyles.tagText}>Poisonous</Text>
              </View>
            )}
          </View>
          {monster.combat !== undefined && (
            <Text style={mStyles.combat}>Combat level: {monster.combat}</Text>
          )}
        </View>
      </View>

      {monster.examine ? (
        <Text style={mStyles.examine}>"{monster.examine}"</Text>
      ) : null}

      {monster.location ? (
        <View style={mStyles.locationRow}>
          <View style={mStyles.locationLabelRow}>
            <Image source={require('../assets/icons/compass.png')} style={styles.compassIcon} />
            <Text style={mStyles.locationLabel}>Location</Text>
          </View>
          <Text style={mStyles.locationText}>{monster.location}</Text>
        </View>
      ) : null}

      {hasCombat && (
        <View style={mStyles.keyStats}>
          {monster.hitpoints !== undefined && (
            <View style={mStyles.keyStatTile}>
              <Text style={mStyles.keyStatLabel}>HP</Text>
              <View style={mStyles.keyStatCenter}>
                <Text style={mStyles.keyStatValue}>{monster.hitpoints}</Text>
              </View>
            </View>
          )}
          {monster.maxHit !== undefined && (
            <View style={mStyles.keyStatTile}>
              <Text style={mStyles.keyStatLabel}>Max Hit</Text>
              <View style={mStyles.keyStatCenter}>
                <Text style={mStyles.keyStatValue}>{monster.maxHit}</Text>
              </View>
            </View>
          )}
          {monster.attackSpeed !== undefined && (
            <View style={mStyles.keyStatTile}>
              <Text style={mStyles.keyStatLabel}>Speed</Text>
              <View style={mStyles.keyStatCenter}>
                <Text style={mStyles.keyStatValue}>{monster.attackSpeed}</Text>
              </View>
            </View>
          )}
          {monster.attackStyle && (
            <View style={mStyles.keyStatTile}>
              <Text style={mStyles.keyStatLabel}>Style</Text>
              <View style={mStyles.keyStatCenter}>
                <Text style={[mStyles.keyStatValue, { fontSize: 18 }]}>{monster.attackStyle}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {hasSlayer && (
        <View style={mStyles.slayerRow}>
          <Text style={mStyles.slayerTitle}>Slayer</Text>
          {monster.slayerLevel ? <Text style={mStyles.slayerText}>Level req: {monster.slayerLevel}</Text> : null}
          {monster.slayerXP    ? <Text style={mStyles.slayerText}>XP per kill: {monster.slayerXP}</Text>  : null}
        </View>
      )}

      {hasDefence && (
        <>
          <View style={mStyles.divider} />
          <Text style={mStyles.bonusHeader}>Defence Bonuses</Text>
          <View style={mStyles.bonusGrid}>
            <View style={mStyles.bonusCol}>
              <StatRow label="Stab"   value={monster.defenceStab   ?? 0} />
              <StatRow label="Slash"  value={monster.defenceSlash  ?? 0} />
              <StatRow label="Crush"  value={monster.defenceCrush  ?? 0} />
            </View>
            <View style={mStyles.bonusDivider} />
            <View style={mStyles.bonusCol}>
              <StatRow label="Magic"  value={monster.defenceMagic  ?? 0} />
              <StatRow label="Ranged" value={monster.defenceRanged ?? 0} />
            </View>
          </View>
        </>
      )}

      {hasAttack && (
        <>
          <View style={mStyles.divider} />
          <Text style={mStyles.bonusHeader}>Attack Bonuses</Text>
          <View style={mStyles.bonusGrid}>
            <View style={mStyles.bonusCol}>
              <StatRow label="Stab"   value={monster.attackStab   ?? 0} />
              <StatRow label="Slash"  value={monster.attackSlash  ?? 0} />
              <StatRow label="Crush"  value={monster.attackCrush  ?? 0} />
            </View>
            <View style={mStyles.bonusDivider} />
            <View style={mStyles.bonusCol}>
              <StatRow label="Magic"  value={monster.attackMagic  ?? 0} />
              <StatRow label="Ranged" value={monster.attackRanged ?? 0} />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const mStyles = StyleSheet.create({
  container: { backgroundColor: theme.colors.panel, borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 4, padding: 14, gap: 12 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  image: { width: 60, height: 60 },
  name: { paddingBottom: 10, fontFamily: theme.fonts.display, fontSize: 22, color: theme.colors.parchment, letterSpacing: 0.3, includeFontPadding: false },
  combat: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.textMuted, marginTop: 4 },
  tagRow: { paddingBottom: 10, flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  tag: { backgroundColor: theme.colors.panelLight, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3 },
  tagRed: { borderColor: theme.colors.redLight, backgroundColor: 'rgba(139,26,26,0.2)' },
  tagGreen: { borderColor: theme.colors.greenLight, backgroundColor: 'rgba(58,138,36,0.2)' },
  tagText: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.parchmentDim },
  examine: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchmentDim, fontStyle: 'italic', lineHeight: 20 },
  locationRow: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, padding: 10, gap: 4 },
  locationLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationLabel: { marginTop: 6, fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.gold, letterSpacing: 1, paddingBottom: 5 },
  locationText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchment, lineHeight: 30, paddingLeft: 5 },
  keyStats: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  keyStatTile: { flex: 1, minWidth: 70, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, padding: 10, alignItems: 'center' },
  keyStatLabel: { fontFamily: theme.fonts.display, fontSize: 13, color: theme.colors.parchmentDark, textTransform: 'uppercase' },
  keyStatCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  keyStatValue: { fontFamily: theme.fonts.display, fontSize: 25, color: theme.colors.goldLight, includeFontPadding: false },
  slayerRow: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, padding: 20, gap: 4 },
  slayerTitle: { fontFamily: theme.fonts.display, fontSize: 21, color: theme.colors.goldLight },
  slayerText: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.parchmentDim },
  divider: { height: 1, backgroundColor: theme.colors.border },
  bonusHeader: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.gold, letterSpacing: 1, textTransform: 'uppercase' },
  bonusGrid: { flexDirection: 'row', paddingBottom: 10 },
  bonusCol: { flex: 1, gap: 2 },
  bonusDivider: { width: 1, backgroundColor: theme.colors.border, marginHorizontal: 10 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  statLabel: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchmentDim },
  statValue: { fontFamily: theme.fonts.display, fontSize: 20, fontWeight: 'bold' },
});

//  Category Card 

function CategoryCard({ cat, onPress }: { cat: typeof MONSTER_CATEGORIES[0]; onPress: () => void }) {
  return (
    <TouchableOpacity style={ccStyles.card} onPress={onPress}>
      <Image source={cat.image} style={ccStyles.icon} resizeMode="contain" />
      <View style={{ flex: 1 }}>
        <Text style={ccStyles.label}>{cat.label}</Text>
        <Text style={ccStyles.desc}>{cat.description}</Text>
      </View>
      <Text style={ccStyles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const ccStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, padding: 14, marginBottom: 8 },
  icon: { width: 36, height: 36 },
  label: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.parchment },
  desc: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.textMuted, marginTop: 3 },
  arrow: { fontFamily: theme.fonts.display, fontSize: 24, color: theme.colors.gold },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BestiaryScreen() {
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MonsterSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMonster, setSelectedMonster] = useState<MonsterDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [categoryMonsters, setCategoryMonsters] = useState<MonsterSummary[]>([]);
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const searchTimer = useRef<any>(null);

  // Auto-search when navigated here with a ?q= param from home search
  useEffect(() => {
    if (q && q.trim().length > 0) {
      setSearchQuery(q);
    }
  }, [q]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchMonsters(searchQuery);
      setSearchResults(results);
      setSearching(false);
    }, 300);
  }, [searchQuery]);

  const handleSelectMonster = useCallback(async (title: string) => {
    setLoadingDetail(true);
    setSelectedMonster(null);
    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
    const detail = await fetchMonsterDetail(title);
    setSelectedMonster(detail ?? { name: title });
    setLoadingDetail(false);
  }, []);

  const handleSelectCategory = useCallback(async (cat: typeof MONSTER_CATEGORIES[0]) => {
    setLoadingCategory(true);
    setCategoryLabel(cat.label);
    setSelectedMonster(null);
    setSearchQuery('');
    setSearchResults([]);
    const monsters = await fetchCategoryMonsters(cat.wikiCategory);
    setCategoryMonsters(monsters);
    setLoadingCategory(false);
  }, []);

  const handleBackFromMonster = useCallback(() => {
    setSelectedMonster(null);
  }, []);

  const handleBackFromCategory = useCallback(() => {
    setCategoryMonsters([]);
    setCategoryLabel(null);
  }, []);

  const showCategories = !searchQuery && !selectedMonster && !categoryLabel && !loadingDetail;

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
              <Text style={styles.screenTitle}>Bestiary</Text>
              <View style={styles.taglineRow}>
                <View style={styles.ornamentLine} />
                <Text style={styles.ornamentSymbol}>✦</Text>
                <Text style={styles.screenSubtitle}>Monsters of Gielinor</Text>
                <Text style={styles.ornamentSymbol}>✦</Text>
                <View style={styles.ornamentLine} />
              </View>
            </View>

            {/* Search */}
            <View style={styles.section}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search any monster…"
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={(q) => {
                  setSearchQuery(q);
                  setSelectedMonster(null);
                  setCategoryMonsters([]);
                  setCategoryLabel(null);
                }}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searching && <ActivityIndicator color={theme.colors.gold} style={{ marginTop: 12 }} />}
              {searchResults.length > 0 && (
                <View style={styles.resultsList}>
                  {searchResults.map((m) => (
                    <TouchableOpacity key={m.title} style={styles.resultRow} onPress={() => handleSelectMonster(m.title)}>
                      <Text style={styles.resultName}>{m.title}</Text>
                      <Text style={styles.resultArrow}>›</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Loading detail */}
            {loadingDetail && (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={theme.colors.gold} size="large" />
                <Text style={styles.loadingText}>Loading monster data…</Text>
              </View>
            )}

            {/* Monster detail */}
            {selectedMonster && !loadingDetail && (
              <View style={styles.section}>
                <TouchableOpacity style={styles.backToCats} onPress={handleBackFromMonster}>
                  <Text style={styles.backToCatsText}>← Back</Text>
                </TouchableOpacity>
                <View style={styles.skillsHeader}>
                  <View style={styles.ornamentLine} />
                  <View style={styles.diamond} />
                  <Text style={styles.sectionTitle}>Monster Detail</Text>
                  <View style={styles.diamond} />
                  <View style={styles.ornamentLine} />
                </View>
                <MonsterDetailPanel monster={selectedMonster} />
              </View>
            )}

            {/* Category monster list */}
            {categoryLabel && !loadingDetail && !selectedMonster && (
              <View style={styles.section}>
                <TouchableOpacity style={styles.backToCats} onPress={handleBackFromCategory}>
                  <Text style={styles.backToCatsText}>← Back to categories</Text>
                </TouchableOpacity>
                <View style={styles.skillsHeader}>
                  <View style={styles.ornamentLine} />
                  <View style={styles.diamond} />
                  <Text style={styles.sectionTitle}>{categoryLabel}</Text>
                  <View style={styles.diamond} />
                  <View style={styles.ornamentLine} />
                </View>
                {loadingCategory ? (
                  <ActivityIndicator color={theme.colors.gold} />
                ) : (
                  <View style={styles.resultsList}>
                    {categoryMonsters.map((m) => (
                      <TouchableOpacity key={m.title} style={styles.resultRow} onPress={() => handleSelectMonster(m.title)}>
                        <Text style={styles.resultName}>{m.title}</Text>
                        <Text style={styles.resultArrow}>›</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Category browser */}
            {showCategories && (
              <View style={styles.section}>
                <View style={styles.skillsHeader}>
                  <View style={styles.ornamentLine} />
                  <View style={styles.diamond} />
                  <Text style={styles.sectionTitle}>Browse by Type</Text>
                  <View style={styles.diamond} />
                  <View style={styles.ornamentLine} />
                </View>
                {MONSTER_CATEGORIES.map((cat) => (
                  <CategoryCard key={cat.label} cat={cat} onPress={() => handleSelectCategory(cat)} />
                ))}
              </View>
            )}

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
  compassIcon: { width: 25, height: 25, marginRight: 4 },
  section: { marginBottom: 20 },
  skillsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  diamond: { width: 6, height: 6, backgroundColor: theme.colors.gold, transform: [{ rotate: '45deg' }], flexShrink: 0 },
  sectionTitle: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight, letterSpacing: 2, textTransform: 'uppercase', includeFontPadding: false },
  searchInput: { borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 3, backgroundColor: theme.colors.background, paddingHorizontal: 14, paddingVertical: 12, fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchment },
  resultsList: { marginTop: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, backgroundColor: theme.colors.panel, overflow: 'hidden' },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  resultName: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchment },
  resultArrow: { fontFamily: theme.fonts.display, fontSize: 22, color: theme.colors.gold },
  loadingBox: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  loadingText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchmentDim },
  backToCats: { marginBottom: 20 },
  backToCatsText: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.gold },
});