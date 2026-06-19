import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Linking,
  ImageSourcePropType,
  Image,
  useWindowDimensions,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import Svg, { Defs, Pattern, Rect, Path, RadialGradient, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import MenuButton from '../components/MenuButton';
import SectionHeader from '../components/SectionHeader';

const WIKI_BASE = 'https://oldschool.runescape.wiki';

type SectionItem = {
  icon: ImageSourcePropType;
  label: string;
  url?: string;
  route?: string;
  category?: string;
};

type DeepItem = {
  label: string;
  sublabel: string;
  icon: ImageSourcePropType;
  route: string;
  deepParam?: string;
};

const SECTIONS: { title: string; items: SectionItem[] }[] = [
  {
    title: 'Combat & Characters',
    items: [
      { icon: require('../assets/icons/menu/adventurers-log.png'), label: "Adventurers Log", route: '/adventurers-log', category: 'Combat & Characters' },
      { icon: require('../assets/icons/menu/items.png'),    label: 'Items',    route: '/items', category: 'Combat & Characters' },
      { icon: require('../assets/icons/menu/equipment.png'), label: 'Gear Planner', route: '/gear-planner', category: 'Combat & Characters' },
      { icon: require('../assets/icons/menu/bestiary.png'), label: 'Bestiary', route: '/bestiary', category: 'Combat & Characters' },
    ],
  },
  {
    title: 'Knowledge & Progression',
    items: [
      { icon: require('../assets/icons/quest-icon.png'), label: 'Quests', route: '/quests', category: 'Knowledge & Progression' },
      { icon: require('../assets/icons/menu/skills.png'), label: 'Skills', route: '/skills', category: 'Knowledge & Progression' },
      { icon: require('../assets/icons/menu/skill-guides.png'), label: 'Skill Guides', route: '/skill-guides', category: 'Knowledge & Progression' },
      { icon: require('../assets/icons/menu/new-player-guide.png'), label: 'New Player Guide', route: '/new-player-guide', category: 'Knowledge & Progression' },
    ],
  },
  {
    title: 'World & Activities',
    items: [
      { icon: require('../assets/icons/menu/locations.png'), label: 'Locations & Map', route: '/locations', category: 'World & Activities' },
      { icon: require('../assets/icons/menu/minigames.png'), label: 'Minigames', route: '/minigames', category: 'World & Activities' },
      { icon: require('../assets/icons/achievement-icon.png'), label: 'Diaries', route: '/achievement-diaries', category: 'World & Activities' },
    ],
  },
  {
    title: 'Utilities',
    items: [
      { icon: require('../assets/icons/menu/ge-logo.png'), label: 'Grand Exchange', route: '/grand-exchange', category: 'Utilities' },
      { icon: require('../assets/icons/menu/calculators.png'), label: 'Calculators', route: '/calculators', category: 'Utilities' },
      { icon: require('../assets/icons/menu/money-making.png'), label: 'Money Making', route: '/money-making', category: 'Utilities' },
    ],
  },
];

//  Deep search index

const BESTIARY_ICON = require('../assets/icons/menu/bestiary.png');
const DIARY_ICON    = require('../assets/icons/achievement-icon.png');
const SKILL_ICON    = require('../assets/icons/menu/skills.png');
const QUEST_ICON    = require('../assets/icons/quest-icon.png');
const LOCATION_ICON = require('../assets/icons/menu/locations.png');
const MINIGAME_ICON = require('../assets/icons/menu/minigames.png');
const GE_ICON       = require('../assets/icons/menu/ge-logo.png');

const DEEP_SEARCH_ITEMS: DeepItem[] = [
  // ── Diaries ──
  ...([
    'Ardougne', 'Desert', 'Falador', 'Fremennik', 'Kandarin', 'Karamja',
    'Kourend & Kebos', 'Lumbridge & Draynor', 'Morytania', 'Varrock',
    'Western Provinces', 'Wilderness',
  ].map(d => ({ label: `${d} Diary`, sublabel: 'Achievement Diaries', icon: DIARY_ICON, route: '/achievement-diaries', deepParam: d }))),

  // ── Quests ──
  ...([
    'Cook\'s Assistant', 'Sheep Shearer', 'Romeo & Juliet', 'The Restless Ghost',
    'Ernest the Chicken', 'Goblin Diplomacy', 'Imp Catcher', 'Witch\'s Potion',
    'Rune Mysteries', 'Dragon Slayer I', 'Vampyre Slayer', 'Demon Slayer',
    'Shield of Arrav', 'Merlin\'s Crystal', 'Holy Grail', 'Biohazard',
    'Plague City', 'Underground Pass', 'Regicide', 'Mourning\'s End Part I',
    'Mourning\'s End Part II', 'Roving Elves', 'Waterfall Quest', 'Tree Gnome Village',
    'The Grand Tree', 'Fight Arena', 'Hazeel Cult', 'Clock Tower',
    'Sheep Herder', 'Monk\'s Friend', 'Murder Mystery', 'Family Crest',
    'Heroes\' Quest', 'Desert Treasure I', 'Desert Treasure II',
    'Monkey Madness I', 'Monkey Madness II', 'Dragon Slayer II',
    'Lunar Diplomacy', 'Dream Mentor', 'Barbarian Training',
    'Legends\' Quest', 'Recipe for Disaster', 'One Small Favour',
    'Fremennik Trials', 'Fremennik Isles', 'Fremennik Exiles',
    'Cabin Fever', 'Rum Deal', 'The Slug Menace', 'Swan Song',
    'Darkness of Hallowvale', 'Sins of the Father', 'A Taste of Hope',
    'Nature Spirit', 'Priest in Peril', 'Haunted Mine', 'Shades of Mort\'ton',
    'In Search of the Myreque', 'In Aid of the Myreque',
    'Lost City', 'Fairytale I - Growing Pains', 'Fairytale II - Cure a Queen',
    'While Guthix Sleeps', 'Children of the Sun', 'The Fallen Empire',
    'Perils of Ice Mountain', 'What Lies Below', 'Wanted!',
    'Death Plateau', 'Troll Stronghold', 'Troll Romance', 'My Arm\'s Big Adventure',
    'Eadgar\'s Ruse', 'Druidic Ritual', 'Herblore Habitat',
    'Witchaven Dungeon', 'Sea Slug', 'Temple of the Eye',
    'A Soul\'s Bane', 'Ratcatchers', 'Tai Bwo Wannai Trio',
    'Zogre Flesh Eaters', 'The Giant Dwarf', 'Between a Rock...',
    'Forgettable Tale of a Drunken Dwarf', 'The Dig Site',
    'The Golem', 'Contact!', 'Icthlarin\'s Little Helper',
    'Spirits of the Elid', 'Enakhra\'s Lament',
    'Gertrude\'s Cat', 'Ratcatchers', 'Rag and Bone Man I', 'Rag and Bone Man II',
    'Bone Voyage', 'Client of Kourend', 'Tale of the Righteous',
    'The Depths of Despair', 'The Queen of Thieves', 'The Corsair Curse',
    'Architectural Alliance', 'Making Friends with My Arm',
    'Perilous Moons', 'Twilight\'s Promise',
  ].map(q => ({ label: q, sublabel: 'Quests', icon: QUEST_ICON, route: '/quests', deepParam: q }))),

  // ── Skills ──
  ...([
    'Attack', 'Strength', 'Defence', 'Ranged', 'Prayer', 'Magic',
    'Runecraft', 'Construction', 'Hitpoints', 'Agility', 'Herblore',
    'Thieving', 'Crafting', 'Fletching', 'Slayer', 'Hunter',
    'Mining', 'Smithing', 'Fishing', 'Cooking', 'Firemaking',
    'Woodcutting', 'Farming',
  ].map(s => ({ label: s, sublabel: 'Skills', icon: SKILL_ICON, route: '/skills', deepParam: s }))),

  // ── Minigames ──
  ...([
    'Barrows', 'Pest Control', 'Castle Wars', 'Barbarian Assault',
    'Fight Caves', 'Inferno', 'Chambers of Xeric', 'Theatre of Blood',
    'Tombs of Amascut', 'Gauntlet', 'Corrupted Gauntlet', 'Tempoross',
    'Wintertodt', 'Zalcano', 'Guardians of the Rift', 'Last Man Standing',
    'Soul Wars', 'Pyramid Plunder', 'Volcanic Mine', 'Blast Furnace',
    'Fishing Trawler', 'Nightmare Zone', 'Mahogany Homes', 'Shades of Mort\'ton',
    'Fortis Colosseum',
  ].map(m => ({ label: m, sublabel: 'Minigames', icon: MINIGAME_ICON, route: '/minigames', deepParam: m }))),

  // ── Locations ──
  ...([
    'Misthalin', 'Asgarnia', 'Kandarin', 'Fremennik Province', 'Morytania',
    'Kharidian Desert', 'Tirannwn', 'Great Kourend', 'Karamja',
    'Wilderness', 'Varlamore',
    'Lumbridge', 'Varrock', 'Falador', 'Ardougne', 'Yanille',
    'Rellekka', 'Keldagrim', 'Prifddinas', 'Canifis', 'Al Kharid',
    'Grand Exchange', 'Edgeville', 'Brimhaven', 'Shilo Village',
  ].map(l => ({ label: l, sublabel: 'Locations', icon: LOCATION_ICON, route: '/locations', deepParam: l }))),

  // ── Common monsters ──
  ...([
    'Abyssal demon', 'Adamant dragon', 'Alchemical Hydra', 'Araxxor',
    'Barrows Brothers', 'Black dragon', 'Blue dragon', 'Bronze dragon',
    'Callisto', 'Cave kraken', 'Cerberus', 'Chaos Elemental',
    'Commander Zilyana', 'Corporeal Beast', 'Dark beast', 'Drake',
    'Duke Sucellus', 'General Graardor', 'Giant Mole', 'Green dragon',
    'Grotesque Guardians', 'Hydra', 'Iron dragon', 'Kalphite Queen',
    'King Black Dragon', 'Kraken', 'Kree\'arra', 'K\'ril Tsutsaroth',
    'Leviathan', 'Lizardman', 'Mithril dragon', 'Nex', 'Nightmare',
    'Obor', 'Phantom Muspah', 'Red dragon', 'Rune dragon',
    'Sarachnis', 'Scorpia', 'Scurrius', 'Skeleton', 'Skotizo',
    'Sol Heredit', 'Spindel', 'Steel dragon', 'Thermonuclear Smoke Devil',
    'TzTok-Jad', 'TzKal-Zuk', 'Vardorvis', 'Venenatis', 'Vet\'ion',
    'Vorkath', 'Whisperer', 'Wyrm', 'Zombie', 'Zulrah',
    'Abyssal Sire', 'Amoxliatl', 'Artio', 'Bryophyta', 'Calvar\'ion',
    'Dagannoth Prime', 'Dagannoth Rex', 'Dagannoth Supreme',
    'Deranged Archaeologist', 'Hespori', 'Mimic', 'Phosani\'s Nightmare',
    'Tempoross', 'Wintertodt',
  ].map(m => ({ label: m, sublabel: 'Bestiary', icon: BESTIARY_ICON, route: '/bestiary', deepParam: m }))),
];

// GE live search 

async function searchGEItems(query: string): Promise<DeepItem[]> {
  if (query.trim().length < 2) return [];
  try {
    const url = `https://services.runescape.com/m=itemdb_oldschool/api/catalogue/items.json?category=1&alpha=${encodeURIComponent(query)}&page=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'AdventurersLog-App/1.0' } });
    const data = await res.json();
    const items: any[] = data?.items ?? [];
    return items.slice(0, 6).map(item => ({
      label: item.name,
      sublabel: `Grand Exchange · ${item.current?.price ?? 'No price data'}`,
      icon: GE_ICON,
      route: '/grand-exchange',
      deepParam: item.name,
    }));
  } catch { return []; }
}

// Flatten screen items for top-level search
const ALL_ITEMS: SectionItem[] = SECTIONS.flatMap(s => s.items);

function StoneBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Image
        source={require('../assets/icons/osrs-bg-scale.png')}
        style={{ width, height }}
        resizeMode="cover"
      />
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject as any}>
        <Defs>
          <RadialGradient id="vignette" cx="50%" cy="45%" r="70%">
            <Stop offset="0%"   stopColor="#0d0900" stopOpacity="0.0" />
            <Stop offset="75%"  stopColor="#0d0900" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0d0900" stopOpacity="0.92" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#vignette)" />
      </Svg>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const titleGlow = useRef(new Animated.Value(0)).current;
  const [search, setSearch] = useState('');
  const [geResults, setGeResults] = useState<DeepItem[]>([]);
  const geTimer = useRef<any>(null);

  const screenResults: (SectionItem & { _type: 'screen' })[] = search.trim().length > 0
    ? ALL_ITEMS
        .filter(item =>
          item.label.toLowerCase().includes(search.toLowerCase()) ||
          item.category?.toLowerCase().includes(search.toLowerCase())
        )
        .map(i => ({ ...i, _type: 'screen' as const }))
    : [];

  const deepResults: (DeepItem & { _type: 'deep' })[] = search.trim().length > 0
    ? DEEP_SEARCH_ITEMS
        .filter(item =>
          item.label.toLowerCase().includes(search.toLowerCase()) ||
          item.sublabel.toLowerCase().includes(search.toLowerCase())
        )
        .slice(0, 12)
        .map(i => ({ ...i, _type: 'deep' as const }))
    : [];

  const hasResults = screenResults.length > 0 || deepResults.length > 0 || geResults.length > 0;

  // GE live search — fires 400ms after typing stops
  useEffect(() => {
    if (geTimer.current) clearTimeout(geTimer.current);
    if (search.trim().length < 2) { setGeResults([]); return; }
    geTimer.current = setTimeout(async () => {
      const results = await searchGEItems(search);
      setGeResults(results);
    }, 400);
    return () => { if (geTimer.current) clearTimeout(geTimer.current); };
  }, [search]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 6,
        bounciness: 3,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(titleGlow, { toValue: 1, duration: 2200, useNativeDriver: false }),
        Animated.timing(titleGlow, { toValue: 0, duration: 2200, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const titleColor = titleGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.gold, theme.colors.goldLight],
  });

  const handlePressScreen = (item: SectionItem) => {
    setSearch('');
    setGeResults([]);
    if (item.route) router.push(item.route as any);
    else if (item.url) Linking.openURL(item.url);
  };

  const handlePressDeep = (item: DeepItem) => {
    setSearch('');
    setGeResults([]);
    if (item.deepParam) {
      router.push({ pathname: item.route as any, params: { q: item.deepParam } });
    } else {
      router.push(item.route as any);
    }
  };

  const renderSection = (section: { title: string; items: SectionItem[] }) => {
    const rows: SectionItem[][] = [];
    for (let i = 0; i < section.items.length; i += 2) {
      rows.push(section.items.slice(i, i + 2));
    }
    return (
      <View key={section.title} style={styles.section}>
        <SectionHeader title={section.title} />
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((item) => (
              <View
                key={item.label}
                style={row.length === 1 ? styles.buttonSingle : styles.buttonHalf}
              >
                <MenuButton
                  icon={item.icon}
                  label={item.label}
                  onPress={() => handlePressScreen(item)}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StoneBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <Image
            source={require('../assets/icons/osrs-logo-copy.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.ornamentRow}>
            <View style={styles.ornamentLine} />
            <Text style={styles.ornamentSymbol}>✦</Text>
            <Text style={styles.ornamentLabel}>Old School RuneScape</Text>
            <Text style={styles.ornamentSymbol}>✦</Text>
            <View style={styles.ornamentLine} />
          </View>
          <View style={styles.titleContainer}>
            <Animated.Text style={[styles.title, { color: titleColor }]}>
              Adventurer's Log
            </Animated.Text>
            <View style={styles.ornamentRow}>
              <View style={styles.ornamentLine} />
              <Text style={styles.ornamentSymbol}>✦</Text>
              <Text style={styles.tagline}>Your Companion to Gielinor</Text>
              <Text style={styles.ornamentSymbol}>✦</Text>
              <View style={styles.ornamentLine} />
            </View>
          </View>
        </Animated.View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity style={styles.searchClear} onPress={() => { setSearch(''); setGeResults([]); }}>
              <Text style={styles.searchClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search results */}
        {hasResults && (
          <View style={styles.searchResults}>
            {/* Screen-level results */}
            {screenResults.map(item => (
              <TouchableOpacity
                key={`screen-${item.label}`}
                style={styles.searchResultRow}
                onPress={() => handlePressScreen(item)}
              >
                <Image source={item.icon} style={styles.searchResultIcon} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchResultLabel}>{item.label}</Text>
                  <Text style={styles.searchResultCategory}>{item.category}</Text>
                </View>
                <Text style={styles.searchResultArrow}>›</Text>
              </TouchableOpacity>
            ))}
            {/* Deep results */}
            {deepResults.map(item => (
              <TouchableOpacity
                key={`deep-${item.label}-${item.sublabel}`}
                style={styles.searchResultRow}
                onPress={() => handlePressDeep(item)}
              >
                <Image source={item.icon} style={styles.searchResultIcon} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchResultLabel}>{item.label}</Text>
                  <Text style={styles.searchResultCategory}>{item.sublabel}</Text>
                </View>
                <Text style={styles.searchResultArrow}>›</Text>
              </TouchableOpacity>
            ))}
            {/* GE live results */}
            {geResults.map(item => (
              <TouchableOpacity
                key={`ge-${item.label}`}
                style={styles.searchResultRow}
                onPress={() => handlePressDeep(item)}
              >
                <Image source={item.icon} style={styles.searchResultIcon} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchResultLabel}>{item.label}</Text>
                  <Text style={styles.searchResultCategory}>{item.sublabel}</Text>
                </View>
                <Text style={styles.searchResultArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {search.trim().length > 0 && !hasResults && (
          <View style={styles.searchEmpty}>
            <Text style={styles.searchEmptyText}>No results for "{search}"</Text>
          </View>
        )}

        {/* Sections — hidden while searching */}
        {search.trim().length === 0 && (
          <Animated.View
            style={[styles.sectionsContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            {SECTIONS.map((section) => renderSection(section))}
          </Animated.View>
        )}

        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <View style={styles.ornamentRow}>
            <View style={styles.ornamentLine} />
            <Text style={styles.ornamentSymbol}>⚜</Text>
            <View style={styles.ornamentLine} />
          </View>
          <Text style={styles.footerText}>Powered by the OSRS Wiki</Text>
          <Text style={styles.footerSub}>oldschool.runescape.wiki</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 30 },
  header: { alignItems: 'center', paddingTop: 16, paddingBottom: 12, marginBottom: 6, gap: 4 },
  logo: { width: '85%', height: 80, marginBottom: 2 },
  titleContainer: { alignItems: 'center', gap: 2 },
  title: {
    fontFamily: theme.fonts.display,
    fontSize: 38,
    letterSpacing: 1,
    paddingTop: 10,
    paddingBottom: 10,
    width: '90%',
    textAlign: 'center',
    textShadowColor: 'rgba(200,160,48,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  tagline: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.parchmentDim, letterSpacing: 1, fontStyle: 'italic' },
  ornamentRow: { flexDirection: 'row', alignItems: 'center', width: '90%', gap: 6 },
  ornamentLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  ornamentSymbol: { color: theme.colors.goldDim, fontSize: 10 },
  ornamentLabel: { fontFamily: theme.fonts.display, fontSize: 11, color: theme.colors.goldDim, letterSpacing: 3, textTransform: 'uppercase' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 5 },
  searchInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    borderRadius: 3,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: theme.fonts.display,
    fontSize: 18,
    color: theme.colors.parchment,
  },
  searchClear: { position: 'absolute', right: 12, padding: 4 },
  searchClearText: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.textMuted },
  searchResults: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 3,
    backgroundColor: theme.colors.panel,
    overflow: 'hidden',
    marginBottom: 16,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  searchResultIcon: { width: 28, height: 28 },
  searchResultLabel: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchment },
  searchResultCategory: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.textMuted, marginTop: 2 },
  searchResultArrow: { fontFamily: theme.fonts.display, fontSize: 22, color: theme.colors.gold },
  searchEmpty: { paddingVertical: 20, alignItems: 'center', marginBottom: 16 },
  searchEmptyText: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.textMuted, fontStyle: 'italic' },
  sectionsContainer: { gap: 6, marginTop: 12 },
  section: { marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  buttonHalf: { flex: 1 },
  buttonSingle: { width: '48%', maxWidth: '48%' },
  footer: { alignItems: 'center', paddingTop: 18, paddingBottom: 4, gap: 6 },
  footerText: { fontFamily: theme.fonts.display, fontSize: 11, color: theme.colors.parchmentDark, letterSpacing: 1 },
  footerSub: { fontFamily: theme.fonts.display, fontSize: 9, color: theme.colors.textMuted, letterSpacing: 0.5 },
});