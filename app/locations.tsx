import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, useWindowDimensions, Linking, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../constants/theme';

// Region data

type Location = { name: string; sub?: Location[] };
type Region = {
  name:        string;
  description: string;
  mapImage:    string;
  locations:   Location[];
};

const REGIONS: Region[] = [
  {
    name: 'Misthalin',
    description: 'The central kingdom — home to Lumbridge, Varrock, and Draynor Village. Where most new players begin their adventure.',
    mapImage: 'https://oldschool.runescape.wiki/images/thumb/Misthalin_map.png/300px-Misthalin_map.png',
    locations: [
      { name: 'Lumbridge', sub: [
        { name: 'Lumbridge Castle' },
        { name: 'Lumbridge Swamp' },
        { name: 'Al Kharid' },
        { name: 'Shantay Pass' },
      ]},
      { name: 'Varrock', sub: [
        { name: 'Grand Exchange' },
        { name: 'Varrock Palace' },
        { name: 'Varrock Sewers' },
        { name: 'Barbarian Village' },
        { name: 'Edgeville' },
        { name: 'Edgeville Dungeon' },
      ]},
      { name: 'Draynor Village', sub: [
        { name: 'Draynor Manor' },
        { name: 'Draynor Bank' },
      ]},
      { name: 'Wizards\' Tower' },
      { name: 'Corsair Cove' },
    ],
  },
  {
    name: 'Asgarnia',
    description: 'A prosperous kingdom west of Misthalin, home to Falador, Taverley, and Port Sarim.',
    mapImage: 'https://oldschool.runescape.wiki/images/thumb/Asgarnia_map.png/300px-Asgarnia_map.png',
    locations: [
      { name: 'Falador', sub: [
        { name: 'White Knights\' Castle' },
        { name: 'Mining Guild' },
        { name: 'Dwarven Mine', sub: [{ name: 'Motherlode Mine' }] },
        { name: 'Falador Park', sub: [{ name: 'Giant Mole lair' }] },
      ]},
      { name: 'Taverley', sub: [
        { name: 'Taverley Dungeon' },
        { name: 'Heroes\' Guild' },
      ]},
      { name: 'Burthorpe', sub: [
        { name: 'Warriors\' Guild' },
        { name: 'Rogues\' Den' },
        { name: 'Death Plateau' },
      ]},
      { name: 'Port Sarim', sub: [
        { name: 'Entrana (boat)' },
        { name: 'Crandor (boat)' },
      ]},
      { name: 'Rimmington' },
      { name: 'Crafting Guild' },
      { name: 'Ice Mountain' },
      { name: 'Goblin Village' },
    ],
  },
  {
    name: 'Kandarin',
    description: 'A large western kingdom containing Seers\' Village, Ardougne, Yanille, and Camelot.',
    mapImage: 'https://oldschool.runescape.wiki/images/thumb/Kandarin_map.png/300px-Kandarin_map.png',
    locations: [
      { name: 'Seers\' Village', sub: [
        { name: 'Camelot Castle' },
        { name: 'McGrubor\'s Wood' },
        { name: 'Sinclair Mansion' },
      ]},
      { name: 'Ardougne', sub: [
        { name: 'East Ardougne' },
        { name: 'West Ardougne' },
        { name: 'Monastery of Saradomin' },
        { name: 'Legends\' Guild' },
      ]},
      { name: 'Yanille', sub: [
        { name: 'Wizards\' Guild' },
        { name: 'Jiggig' },
      ]},
      { name: 'Catherby' },
      { name: 'Fishing Guild' },
      { name: 'Tree Gnome Stronghold', sub: [
        { name: 'Grand Tree' },
        { name: 'Gnome Agility Course' },
      ]},
      { name: 'Tree Gnome Village' },
      { name: 'Barbarian Outpost', sub: [
        { name: 'Barbarian Assault' },
      ]},
      { name: 'Castle Wars' },
      { name: 'Ranging Guild' },
    ],
  },
  {
    name: 'Fremennik Province',
    description: 'A northern region of harsh tundra, home to Rellekka, Lunar Isle, and the Fremennik people.',
    mapImage: 'https://oldschool.runescape.wiki/images/thumb/Fremennik_Province_map.png/300px-Fremennik_Province_map.png',
    locations: [
      { name: 'Rellekka', sub: [
        { name: 'Fremennik Slayer Dungeon' },
        { name: 'Mountain Camp' },
      ]},
      { name: 'Keldagrim', sub: [
        { name: 'Blast Furnace' },
      ]},
      { name: 'Lunar Isle' },
      { name: 'Waterbirth Island', sub: [
        { name: 'Waterbirth Dungeon (Dagannoth Kings)' },
      ]},
      { name: 'Jatizso' },
      { name: 'Neitiznot' },
      { name: 'Miscellania & Etceteria' },
      { name: 'Iceberg' },
    ],
  },
  {
    name: 'Morytania',
    description: 'A dark, dangerous region east of Misthalin, overrun with undead, vampyres, and the Myreque resistance.',
    mapImage: 'https://oldschool.runescape.wiki/images/thumb/Morytania_map.png/300px-Morytania_map.png',
    locations: [
      { name: 'Canifis', sub: [
        { name: 'Slayer Tower' },
        { name: 'Fenkenstrain\'s Castle' },
      ]},
      { name: 'Barrows', sub: [
        { name: 'Barrows crypts' },
      ]},
      { name: 'Burgh de Rott' },
      { name: 'Meiyerditch' },
      { name: 'Darkmeyer', sub: [
        { name: 'Verzik Vitur\'s basement (ToB)' },
      ]},
      { name: 'Theatre of Blood (Verzik)' },
      { name: 'Mort Myre Swamp' },
      { name: 'Haunted Mine' },
      { name: 'Shades of Mort\'ton' },
    ],
  },
  {
    name: 'Kharidian Desert',
    description: 'A vast southern desert containing Pollnivneach, Nardah, and the pyramid of the Kharidian ancients.',
    mapImage: 'https://oldschool.runescape.wiki/images/thumb/Kharidian_Desert_map.png/300px-Kharidian_Desert_map.png',
    locations: [
      { name: 'Al Kharid', sub: [
        { name: 'Al Kharid Mine' },
        { name: 'Duel Arena' },
      ]},
      { name: 'Pollnivneach' },
      { name: 'Nardah' },
      { name: 'Pyramid Plunder (Sophanem)' },
      { name: 'Jaldraocht Pyramid (Desert Treasure)' },
      { name: 'Agility Pyramid' },
      { name: 'Kalphite Lair', sub: [
        { name: 'Kalphite Queen' },
      ]},
      { name: 'Smoke Dungeon' },
      { name: 'Bandit Camp' },
    ],
  },
  {
    name: 'Tirannwn',
    description: 'The elven lands to the far west, largely inaccessible until completing Underground Pass. Home to Prifddinas.',
    mapImage: 'https://oldschool.runescape.wiki/images/thumb/Tirannwn_map.png/300px-Tirannwn_map.png',
    locations: [
      { name: 'Lletya' },
      { name: 'Prifddinas', sub: [
        { name: 'Zalcano' },
        { name: 'Gauntlet' },
        { name: 'Corrupted Gauntlet' },
      ]},
      { name: 'Tyras Camp' },
      { name: 'Isafdar' },
      { name: 'Arandar' },
    ],
  },
  {
    name: 'Great Kourend',
    description: 'A large continent to the south-west, divided into five cities. Introduced as part of the Kourend & Kebos storyline.',
    mapImage: 'https://oldschool.runescape.wiki/images/thumb/Great_Kourend_map.png/300px-Great_Kourend_map.png',
    locations: [
      { name: 'Arceuus', sub: [
        { name: 'Blood Altar' },
        { name: 'Soul Altar' },
        { name: 'Dark Altar' },
        { name: 'Dense Essence Mine' },
      ]},
      { name: 'Hosidius', sub: [
        { name: 'Tithe Farm' },
        { name: 'Woodcutting Guild' },
        { name: 'Kourend Woodland' },
      ]},
      { name: 'Lovakengj', sub: [
        { name: 'Blast Mine' },
        { name: 'Sulphur Mine' },
      ]},
      { name: 'Piscarilius', sub: [
        { name: 'Port Piscarilius' },
      ]},
      { name: 'Shayzien', sub: [
        { name: 'Combat Ring' },
        { name: 'Lizardman Canyon' },
      ]},
      { name: 'Catacombs of Kourend' },
      { name: 'Kebos Lowlands', sub: [
        { name: 'Farming Guild' },
        { name: 'Chambers of Xeric' },
        { name: 'Mount Quidamortem' },
        { name: 'Lizardman Caves' },
      ]},
    ],
  },
  {
    name: 'Karamja',
    description: 'A tropical island south of Misthalin, home to Brimhaven, Tai Bwo Wannai, and the TzHaar city.',
    mapImage: 'https://oldschool.runescape.wiki/images/thumb/Karamja_map.png/300px-Karamja_map.png',
    locations: [
      { name: 'Brimhaven', sub: [
        { name: 'Brimhaven Agility Arena' },
        { name: 'Brimhaven Dungeon' },
      ]},
      { name: 'Tai Bwo Wannai' },
      { name: 'Shilo Village' },
      { name: 'TzHaar City', sub: [
        { name: 'Fight Cave (TzTok-Jad)' },
        { name: 'Inferno (TzKal-Zuk)' },
      ]},
      { name: 'Karamja Volcano', sub: [
        { name: 'Crandor & Elvarg\'s lair' },
      ]},
      { name: 'Ape Atoll', sub: [
        { name: 'Monkey Madness dungeon' },
      ]},
    ],
  },
  {
    name: 'Wilderness',
    description: 'The dangerous north — a lawless PvP zone where players can attack each other and steal your items on death. Enter with extreme caution.',
    mapImage: 'https://oldschool.runescape.wiki/images/thumb/Wilderness_map.png/300px-Wilderness_map.png',
    locations: [
      { name: 'Edgeville (entrance)' },
      { name: 'Chaos Temple' },
      { name: 'Forgotten Cemetery' },
      { name: 'Lava Maze', sub: [
        { name: 'King Black Dragon Lair' },
      ]},
      { name: 'Rogues\' Castle' },
      { name: 'Mage Arena', sub: [
        { name: 'Mage Arena II (bosses)' },
      ]},
      { name: 'Demonic Ruins' },
      { name: 'Resource Area' },
      { name: 'Revenant Caves' },
      { name: 'Callisto\'s Lair' },
      { name: 'Venenatis\' Lair' },
      { name: 'Vet\'ion\'s Lair' },
      { name: 'Scorpia\'s Lair' },
    ],
  },
  {
    name: 'Varlamore',
    description: 'A newer continent south of Misthalin, introduced in 2024. Home to Fortis Colosseum, Hunters\' Guild, and more.',
    mapImage: 'https://oldschool.runescape.wiki/images/thumb/Varlamore_map.png/300px-Varlamore_map.png',
    locations: [
      { name: 'Civitas illa Fortis', sub: [
        { name: 'Fortis Colosseum (Sol Heredit)' },
        { name: 'Mossy Rock area' },
      ]},
      { name: 'Hunters\' Guild' },
      { name: 'Quetzacalli Gorge' },
      { name: 'Moon Rise Plateau', sub: [
        { name: 'Amoxliatl boss' },
      ]},
      { name: 'Ralos\' Rise' },
    ],
  },
];

// Background

function StoneBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Image source={require('../assets/icons/osrs-bg-scale.png')} style={{ width, height }} resizeMode="cover" />
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject as any}>
        <Defs>
          <RadialGradient id="vigLoc" cx="50%" cy="45%" r="70%">
            <Stop offset="0%"   stopColor="#0d0900" stopOpacity="0.0" />
            <Stop offset="75%"  stopColor="#0d0900" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0d0900" stopOpacity="0.92" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#vigLoc)" />
      </Svg>
    </View>
  );
}

// Location tree row 

function LocationRow({ loc, depth = 0 }: { loc: Location; depth?: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasSubs = loc.sub && loc.sub.length > 0;
  const indent = depth * 16;
  const bullet = depth === 0 ? '•' : depth === 1 ? '◦' : '▸';

  const handlePress = () => {
    if (hasSubs) setExpanded(v => !v);
    else Linking.openURL(`https://oldschool.runescape.wiki/w/${encodeURIComponent(loc.name.replace(/ /g, '_'))}`);
  };

  return (
    <View>
      <TouchableOpacity
        style={[locStyles.row, { paddingLeft: 12 + indent }]}
        onPress={handlePress}
      >
        <Text style={[locStyles.bullet, depth === 0 && locStyles.bulletPrimary]}>{bullet}</Text>
        <Text style={[locStyles.name, depth === 0 && locStyles.namePrimary]} numberOfLines={1}>
          {loc.name}
        </Text>
        {hasSubs && (
          <Text style={locStyles.chevron}>{expanded ? '▾' : '▸'}</Text>
        )}
        {!hasSubs && (
          <Text style={locStyles.wikiLink}>wiki  ►</Text>
        )}
      </TouchableOpacity>
      {expanded && hasSubs && loc.sub!.map((sub) => (
        <LocationRow key={sub.name} loc={sub} depth={depth + 1} />
      ))}
    </View>
  );
}

const locStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingRight: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 8 },
  bullet: { fontSize: 20, color: theme.colors.parchmentDark, width: 12 },
  bulletPrimary: { color: theme.colors.gold },
  name: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchmentDim, flex: 1 },
  namePrimary: { fontSize: 20, color: theme.colors.parchment },
  chevron: { color: theme.colors.gold, fontSize: 20 },
  wikiLink: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.goldDim },
});

// Region card

function RegionCard({ region }: { region: Region }) {
  const [expanded, setExpanded] = useState(false);
  const [mapError, setMapError] = useState(false);

  return (
    <View style={regStyles.card}>
      <TouchableOpacity style={regStyles.header} onPress={() => setExpanded(v => !v)}>
        <View style={{ flex: 1 }}>
          <Text style={regStyles.name}>{region.name}</Text>
          <Text style={regStyles.desc} numberOfLines={expanded ? undefined : 1}>{region.description}</Text>
        </View>
        <Text style={regStyles.chevron}>{expanded ? '▾' : '▸'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={regStyles.body}>
          {!mapError ? (
            <Image
              source={{ uri: region.mapImage }}
              style={regStyles.mapImage}
              resizeMode="contain"
              onError={() => setMapError(true)}
            />
          ) : (
            <TouchableOpacity
              style={regStyles.mapFallback}
              onPress={() => Linking.openURL(`https://oldschool.runescape.wiki/w/${encodeURIComponent(region.name.replace(/ /g, '_'))}`)}
            >
              <Text style={regStyles.mapFallbackText}>View the {region.name} map on the wiki  ▸</Text>
            </TouchableOpacity>
          )}
          <View style={regStyles.locationList}>
            {region.locations.map((loc) => (
              <LocationRow key={loc.name} loc={loc} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const regStyles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 8, backgroundColor: theme.colors.panel },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  name: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.parchment, includeFontPadding: false },
  desc: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.textMuted, marginTop: 5, lineHeight: 25 },
  chevron: { color: theme.colors.gold, fontSize: 20, marginLeft: 4 },
  body: { backgroundColor: theme.colors.background, borderTopWidth: 1, borderTopColor: theme.colors.border },
  mapImage: { width: '100%', height: 180, backgroundColor: theme.colors.background, padding: 10 },
  mapFallback: { padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  mapFallbackText: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.gold },
  locationList: { borderTopWidth: 1, borderTopColor: theme.colors.border },
});

// World Map WebView

function WorldMapView({ height }: { height: number }) {
  const [mapExpanded, setMapExpanded] = useState(false);
  const mapHeight = mapExpanded ? 520 : 280;

  const injectedJS = `
    (function() {
      document.body.style.margin = '0';
      document.body.style.padding = '0';
    })();
    true;
  `;

  return (
    <View style={mapStyles.container}>
      <View style={[mapStyles.webviewWrapper, { height: mapHeight }]}>
        <WebView
          source={{ uri: 'https://mejrs.github.io/osrs?m=-1&z=2&p=0&x=3222&y=3218' }}
          style={mapStyles.webview}
          injectedJavaScript={injectedJS}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled
          bounces={false}
          startInLoadingState
          renderLoading={() => (
            <View style={mapStyles.loadingOverlay}>
              <Text style={mapStyles.loadingText}>Loading world map…</Text>
            </View>
          )}
        />
      </View>
      <TouchableOpacity
        style={mapStyles.expandBtn}
        onPress={() => setMapExpanded(v => !v)}
      >
        <Text style={mapStyles.expandBtnText}>
          {mapExpanded ? '▲ Collapse map' : '▼ Expand map'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={mapStyles.fullBtn}
        onPress={() => Linking.openURL('https://mejrs.github.io/osrs')}
      >
        <Text style={mapStyles.fullBtnText}>Open full map in browser  ►</Text>
      </TouchableOpacity>
    </View>
  );
}

const mapStyles = StyleSheet.create({
  container: { gap: 8, marginBottom: 10, marginTop: 10 },
  webviewWrapper: { borderRadius: 4, overflow: 'hidden', borderWidth: 1.5, borderColor: theme.colors.borderGold },
  webview: { flex: 1, backgroundColor: theme.colors.background },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.panel, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchmentDim },
  expandBtn: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, paddingVertical: 15, alignItems: 'center', backgroundColor: theme.colors.panel },
  expandBtnText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.gold },
  fullBtn: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, paddingVertical: 15, alignItems: 'center', backgroundColor: theme.colors.background },
  fullBtnText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchmentDim },
});

// Main Screen

export default function LocationsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
          <Text style={styles.screenTitle}>Locations</Text>
          <View style={styles.taglineRow}>
            <View style={styles.ornamentLine} />
            <Text style={styles.ornamentSymbol}>✦</Text>
            <Text style={styles.screenSubtitle}>Explore the world of Gielinor</Text>
            <Text style={styles.ornamentSymbol}>✦</Text>
            <View style={styles.ornamentLine} />
          </View>
        </View>

        <View style={styles.section}>
          <WorldMapView height={280} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.ornamentLine} />
            <View style={styles.diamond} />
            <Text style={styles.sectionTitle}>Browse by Region</Text>
            <View style={styles.diamond} />
            <View style={styles.ornamentLine} />
          </View>
          <Text style={styles.hint}>
            Tap a region to see its map and locations. Tap a location to open its wiki page.
          </Text>
          {REGIONS.map((region) => (
            <RegionCard key={region.name} region={region} />
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  diamond: { width: 6, height: 6, backgroundColor: theme.colors.gold, transform: [{ rotate: '45deg' }], flexShrink: 0 },
  sectionTitle: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight, letterSpacing: 2, textTransform: 'uppercase', includeFontPadding: false },
  hint: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.textMuted, marginBottom: 20, lineHeight: 30, textAlign: 'center' },
});