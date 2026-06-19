import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, Linking, useWindowDimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../constants/theme';

// Money making categories

type Intensity = 'AFK' | 'Semi-AFK' | 'Active';
type Method = {
  name:        string;
  gp:          string;
  skills:      string;
  intensity:   Intensity;
  members:     boolean;
  description: string;
};

type Category = {
  name:        string;
  icon:        any;
  description: string;
  wikiPage:    string;
  topMethods:  Method[];
};

const CATEGORIES: Category[] = [
  {
    name: 'Combat', icon: require('../assets/icons/combat.png'),
    description: 'Kill monsters and bosses for valuable drops. Generally higher skill requirements but the best gp/hr at the top end.',
    wikiPage: 'Money_making_guide/Combat',
    topMethods: [
      { name: 'Killing Vorkath', gp: '3–4m/hr', skills: '70+ all combat, DT2 complete', intensity: 'Active', members: true, description: 'One of the most consistent bossing money makers. Requires completion of Dragon Slayer II and solid gear.' },
      { name: 'Killing Zulrah', gp: '2–3m/hr', skills: '70+ all combat', intensity: 'Active', members: true, description: 'Iconic money-making boss. Requires learning the rotation but very consistent profits once mastered.' },
      { name: 'Killing green dragons', gp: '200–400k/hr', skills: '60+ combat', intensity: 'Semi-AFK', members: true, description: 'Great early-game money in the Wilderness. Green dragon bones + hides sell well. Bring anti-dragon shield.' },
      { name: 'Killing blue dragons', gp: '300–500k/hr', skills: '65+ combat', intensity: 'Semi-AFK', members: true, description: 'Blue dragon bones are worth ~3x more than green. Taverley Dungeon or Ogre Enclave.' },
      { name: 'Dagannoth Kings', gp: '1.5–2.5m/hr', skills: '80+ combat', intensity: 'Active', members: true, description: 'Three kings in Waterbirth Island. Each drops a valuable berserker/archer/seers ring. Trio or solo.' },
      { name: 'Killing Hill Giants (F2P)', gp: '60–100k/hr', skills: '40+ combat', intensity: 'Semi-AFK', members: false, description: 'Best F2P money maker for low levels. Big bones + limpwurt roots from Edgeville Dungeon (need brass key).' },
    ],
  },
  {
    name: 'Skilling', icon: require('../assets/icons/efficiency.png'),
    description: 'Gather or process resources using non-combat skills. Great for ironmen and accounts focused on skilling.',
    wikiPage: 'Money_making_guide/Skilling',
    topMethods: [
      { name: 'Cutting yew logs (F2P)', gp: '30–50k/hr', skills: '60 Woodcutting', intensity: 'AFK', members: false, description: 'Best F2P passive money maker. South of Falador and Edgeville are popular spots.' },
      { name: 'Mining runite ore', gp: '200–350k/hr', skills: '85 Mining', intensity: 'Semi-AFK', members: true, description: 'High-value ore. Wilderness Resource Area or Heroes\' Guild. World-hop between deposits.' },
      { name: 'Catching red chinchompas', gp: '400–700k/hr', skills: '63 Hunter', intensity: 'Active', members: true, description: 'Most popular Hunter money maker. Feldip Hills area. Red chins sell very well for Ranged training.' },
      { name: 'Picking flax', gp: '50–80k/hr', skills: 'None', intensity: 'Semi-AFK', members: true, description: 'Simple F2P-accessible money maker. Seers\' Village flax field. Can spin into bowstrings for more profit.' },
      { name: 'Farming herb runs', gp: '300k–1m/hr', skills: '32+ Farming', intensity: 'AFK', members: true, description: 'Most profitable use of game time. Takes 5–10 minutes every 80 minutes. Ranarr and Snapdragon most profitable.' },
      { name: 'Anglerfish fishing', gp: '150–250k/hr', skills: '82 Fishing', intensity: 'AFK', members: true, description: 'Very AFK Fishing money. Anglerfish are BiS healing food and always in demand.' },
    ],
  },
  {
    name: 'Processing', icon: require('../assets/icons/herb.png'),
    description: 'Buy raw materials, process them, and sell the finished product. Requires capital but can be very consistent.',
    wikiPage: 'Money_making_guide/Processing',
    topMethods: [
      { name: 'Making unfinished potions', gp: '200–500k/hr', skills: '1+ Herblore', intensity: 'Active', members: true, description: 'Buy grimy herbs, clean them, add water to vials. Very click-intensive but good gp/hr for any Herblore level.' },
      { name: 'Blast Furnace steel bars', gp: '150–350k/hr', skills: '30 Smithing', intensity: 'Active', members: true, description: 'Smelt steel bars at half coal cost. Very consistent profit. World 358 is the official BF world.' },
      { name: 'High Level Alchemy', gp: 'Varies', skills: '55 Magic', intensity: 'Semi-AFK', members: false, description: 'Convert items to gold using High Alch. Check current best items on the GE. Can be done while doing other things.' },
      { name: 'Stringing amulets', gp: '100–200k/hr', skills: '80 Magic (Lunar)', intensity: 'AFK', members: true, description: 'Use String Jewellery spell to string unstrung amulets. Very AFK. Buy unstrung, sell strung.' },
      { name: 'Cutting gems', gp: '100–300k/hr', skills: '40+ Crafting', intensity: 'Active', members: false, description: 'Buy uncut gems, cut them, sell cut gems. Diamond and dragonstone most profitable.' },
      { name: 'Making potions (bulk)', gp: '300k–600k/hr', skills: '65+ Herblore', intensity: 'Active', members: true, description: 'Super restore and prayer potions are always in high demand from PvMers.' },
    ],
  },
  {
    name: 'Collecting', icon: require('../assets/icons/collecting.png'),
    description: 'Gather free or cheap items from the world. Lower requirements but time-consuming.',
    wikiPage: 'Money_making_guide/Collecting',
    topMethods: [
      { name: 'Collecting mort myre fungi', gp: '100–200k/hr', skills: 'Nature Spirit complete', intensity: 'Semi-AFK', members: true, description: 'Cast Bloom on rotting logs in Mort Myre Swamp. Fungi sell well for Herblore training.' },
      { name: 'Collecting cursed goblin mail', gp: '50–100k/hr', skills: 'Low combat', intensity: 'AFK', members: true, description: 'Loot goblin mail from goblins in Goblin Village then alch it.' },
      { name: 'Picking cactus spines', gp: '50–100k/hr', skills: 'None', intensity: 'AFK', members: true, description: 'Al Kharid cactus replenishes spines regularly. Good passive collecting run alongside other activities.' },
      { name: 'Tanning cowhides (F2P)', gp: '60–100k/hr', skills: 'None', intensity: 'Active', members: false, description: 'Kill cows → pick up hides → tan at Al Kharid tanner → sell soft leather. Excellent early F2P money.' },
    ],
  },
  {
    name: 'Recurring', icon: require('../assets/icons/barrel.png'),
    description: 'Daily or weekly activities that generate consistent profit with minimal time investment.',
    wikiPage: 'Money_making_guide/Recurring',
    topMethods: [
      { name: 'Herb runs', gp: '300k–1m per run', skills: '32+ Farming', intensity: 'AFK', members: true, description: 'Plant and harvest herbs every 80 minutes. 5–8 patches. Snapdragon, Ranarr, Toadflax most profitable.' },
      { name: 'Birdhouse runs', gp: '50–100k per run', skills: '5+ Hunter', intensity: 'AFK', members: true, description: 'Set up bird houses on Fossil Island every 50 minutes. Seeds, nests, and feathers from the nests.' },
      { name: 'Tithe farm daily supplies', gp: 'Varies', skills: '34+ Farming', intensity: 'Semi-AFK', members: true, description: 'Points for Herb sack, Bottomless compost bucket, and Farmer\'s outfit — saves time and money long-term.' },
      { name: 'Tears of Guthix', gp: 'Free XP', skills: 'Tears of Guthix complete', intensity: 'AFK', members: false, description: 'Weekly free XP in your lowest skill. Takes 1 minute per week. Always worth doing.' },
      { name: 'Kingdom of Miscellania', gp: '200–500k/day', skills: 'Throne of Miscellania complete', intensity: 'AFK', members: true, description: 'Collect daily resources from managing your kingdom. Invest 750k and collect weekly.' },
    ],
  },
  {
    name: 'Free-to-Play', icon: require('../assets/icons/profit.png'),
    description: 'Money making methods accessible without membership. Lower rates but still viable early game.',
    wikiPage: 'Money_making_guide/Free-to-play',
    topMethods: [
      { name: 'Cutting yew logs', gp: '30–50k/hr', skills: '60 Woodcutting', intensity: 'AFK', members: false, description: 'Best passive F2P money maker. South Falador, Varrock Castle, Edgeville are top spots.' },
      { name: 'Killing Hill Giants', gp: '60–100k/hr', skills: '40+ combat', intensity: 'Semi-AFK', members: false, description: 'Big bones + limpwurt roots in Edgeville Dungeon. Need brass key. Great early money.' },
      { name: 'Stronghold of Security', gp: '10,000 one-time', skills: 'None', intensity: 'Active', members: false, description: 'Complete all four floors for a one-time 10k reward. Takes 10–15 minutes. Do this on every new account.' },
      { name: 'Tanning cowhides', gp: '60–100k/hr', skills: 'None', intensity: 'Active', members: false, description: 'Kill cows near Lumbridge, tan hides in Al Kharid, sell soft leather. Classic starter method.' },
      { name: 'Mining coal', gp: '60–80k/hr', skills: '30 Mining', intensity: 'AFK', members: false, description: 'Coal sells well for player smelters. Mining Guild (requires 60) has higher density.' },
    ],
  },
];

const INTENSITY_COLORS: Record<Intensity, string> = {
  'AFK':       theme.colors.greenLight,
  'Semi-AFK':  '#c8a030',
  'Active':    theme.colors.redLight,
};

// Background

function StoneBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Image source={require('../assets/icons/osrs-bg-scale.png')} style={{ width, height }} resizeMode="cover" />
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject as any}>
        <Defs>
          <RadialGradient id="vigMM" cx="50%" cy="45%" r="70%">
            <Stop offset="0%" stopColor="#0d0900" stopOpacity="0.0" />
            <Stop offset="75%" stopColor="#0d0900" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0d0900" stopOpacity="0.92" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#vigMM)" />
      </Svg>
    </View>
  );
}

// Method card

function MethodCard({ method }: { method: Method }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity style={mcStyles.card} onPress={() => setExpanded(v => !v)} activeOpacity={0.8}>
      <View style={mcStyles.top}>
        <View style={{ flex: 1 }}>
          <Text style={mcStyles.name}>{method.name}</Text>
          <Text style={mcStyles.skills}>{method.skills}</Text>
        </View>
        <View style={mcStyles.right}>
          <Text style={mcStyles.gp}>{method.gp}</Text>
          <View style={[mcStyles.intensityTag, { borderColor: INTENSITY_COLORS[method.intensity] }]}>
            <Text style={[mcStyles.intensityText, { color: INTENSITY_COLORS[method.intensity] }]}>{method.intensity}</Text>
          </View>
        </View>
      </View>
      {expanded && <Text style={mcStyles.desc}>{method.description}</Text>}
    </TouchableOpacity>
  );
}

const mcStyles = StyleSheet.create({
  card: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, padding: 12, marginBottom: 6, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchment },
  skills: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.textMuted, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  gp: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.goldLight, paddingBottom: 2 },
  intensityTag: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3 },
  intensityText: { fontFamily: theme.fonts.display, fontSize: 14 },
  desc: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchmentDim, lineHeight: 27, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8 },
});

// Category section

function CategorySection({ cat, expanded, onToggle }:
  { cat: Category; expanded: boolean; onToggle: () => void }) {
  return (
    <View style={csStyles.wrapper}>
      <TouchableOpacity style={csStyles.header} onPress={onToggle}>
        <Image source={cat.icon} style={csStyles.icon} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={csStyles.name}>{cat.name}</Text>
          <Text style={csStyles.desc} numberOfLines={expanded ? undefined : 1}>{cat.description}</Text>
        </View>
        <Text style={csStyles.chevron}>{expanded ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={csStyles.body}>
          {cat.topMethods.map(m => <MethodCard key={m.name} method={m} />)}
          <TouchableOpacity style={csStyles.wikiBtn}
            onPress={() => Linking.openURL(`https://oldschool.runescape.wiki/w/${cat.wikiPage}`)}>
            <Text style={csStyles.wikiBtnText}>See full {cat.name.toLowerCase()} guide on wiki  ▸</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const csStyles = StyleSheet.create({
  wrapper: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 8, backgroundColor: theme.colors.panel },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  icon: { width: 28, height: 28 },
  name: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchment },
  desc: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.textMuted, marginTop: 2, lineHeight: 23 },
  chevron: { color: theme.colors.gold, fontSize: 20 },
  body: { backgroundColor: theme.colors.background, borderTopWidth: 1, borderTopColor: theme.colors.border, padding: 12, gap: 4 },
  wikiBtn: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, paddingVertical: 10, alignItems: 'center', marginTop: 6, backgroundColor: theme.colors.panel },
  wikiBtnText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchmentDim },
});

// Main screen

export default function MoneyMakingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [expandedCat, setExpandedCat] = useState<string | null>('Combat');
  const [showLiveGuide, setShowLiveGuide] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Home</Text>
          </TouchableOpacity>
          <View style={styles.ornamentRow}>
            <View style={styles.ornamentLine} /><Text style={styles.ornamentSymbol}>✦</Text>
            <Text style={styles.ornamentLabel}>Old School RuneScape</Text>
            <Text style={styles.ornamentSymbol}>✦</Text><View style={styles.ornamentLine} />
          </View>
          <Text style={styles.screenTitle}>Money Making Guide</Text>
          <View style={styles.taglineRow}>
            <View style={styles.ornamentLine} /><Text style={styles.ornamentSymbol}>✦</Text>
            <Text style={styles.screenSubtitle}>Fill Your Coffers</Text>
            <Text style={styles.ornamentSymbol}>✦</Text><View style={styles.ornamentLine} />
          </View>
        </View>

        {/* Intensity legend */}
        <View style={styles.legend}>
          {Object.entries(INTENSITY_COLORS).map(([label, color]) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.legendHint}>Tap a method to expand details</Text>

        {/* Live wiki guide toggle */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.ornamentLine} /><View style={styles.diamond} />
            <Text style={styles.sectionTitle}>Live Wiki Guide</Text>
            <View style={styles.diamond} /><View style={styles.ornamentLine} />
          </View>
          <Text style={styles.liveDesc}>
            The wiki's money making guide uses live GE prices — always up to date. Toggle it below or open in browser.
          </Text>
          <View style={styles.liveButtons}>
            <TouchableOpacity style={[styles.liveToggleBtn, showLiveGuide && styles.liveToggleBtnActive]}
              onPress={() => setShowLiveGuide(v => !v)}>
              <Text style={[styles.liveToggleBtnText, showLiveGuide && styles.liveToggleBtnTextActive]}>
                {showLiveGuide ? 'Hide live guide' : 'Show live guide'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.wikiOpenBtn}
              onPress={() => Linking.openURL('https://oldschool.runescape.wiki/w/Money_making_guide')}>
              <Text style={styles.wikiOpenBtnText}>Open in browser  ▸</Text>
            </TouchableOpacity>
          </View>
          {showLiveGuide && (
            <View style={styles.webviewWrapper}>
              <WebView
                source={{ uri: 'https://oldschool.runescape.wiki/w/Money_making_guide' }}
                style={{ height: 600 }}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState
              />
            </View>
          )}
        </View>

        {/* Category methods */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.ornamentLine} /><View style={styles.diamond} />
            <Text style={styles.sectionTitle}>Browse by Category</Text>
            <View style={styles.diamond} /><View style={styles.ornamentLine} />
          </View>
          {CATEGORIES.map(cat => (
            <CategorySection
              key={cat.name}
              cat={cat}
              expanded={expandedCat === cat.name}
              onToggle={() => setExpandedCat(expandedCat === cat.name ? null : cat.name)}
            />
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  header: { alignItems: 'center', paddingTop: 10, paddingBottom: 6, marginBottom: 16, gap: 8 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 4, paddingBottom: 10 },
  backButtonText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.gold, letterSpacing: 0.5 },
  screenTitle: { fontFamily: theme.fonts.display, fontSize: 34, color: theme.colors.gold, letterSpacing: 1, textShadowColor: 'rgba(200,160,48,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12, includeFontPadding: false, lineHeight: 42, textAlign: 'center' },
  screenSubtitle: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.parchmentDim, fontStyle: 'italic', letterSpacing: 1, includeFontPadding: false },
  ornamentRow: { flexDirection: 'row', alignItems: 'center', width: '90%', gap: 6 },
  taglineRow: { flexDirection: 'row', alignItems: 'center', width: '90%', gap: 6 },
  ornamentLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  ornamentSymbol: { color: theme.colors.goldDim, fontSize: 10 },
  ornamentLabel: { fontFamily: theme.fonts.display, fontSize: 11, color: theme.colors.goldDim, letterSpacing: 3, textTransform: 'uppercase', includeFontPadding: false },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10, alignItems: 'center', justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 4 },
  legendText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchmentDark },
  legendHint: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginBottom: 15 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  diamond: { width: 6, height: 6, backgroundColor: theme.colors.gold, transform: [{ rotate: '45deg' }], flexShrink: 0 },
  sectionTitle: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight, letterSpacing: 2, textTransform: 'uppercase', includeFontPadding: false },
  liveDesc: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchmentDim, lineHeight: 30, marginBottom: 15, textAlign: 'center' },
  liveButtons: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  liveToggleBtn: { flex: 1, borderWidth: 1, borderColor: theme.colors.borderGold, borderRadius: 3, paddingVertical: 11, alignItems: 'center', backgroundColor: theme.colors.panel },
  liveToggleBtnActive: { backgroundColor: theme.colors.panelLight },
  liveToggleBtnText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.gold },
  liveToggleBtnTextActive: { color: theme.colors.goldLight },
  wikiOpenBtn: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, paddingVertical: 11, alignItems: 'center', backgroundColor: theme.colors.background },
  wikiOpenBtnText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchmentDim },
  webviewWrapper: { borderRadius: 4, overflow: 'hidden', borderWidth: 1.5, borderColor: theme.colors.borderGold, marginTop: 4 },
});