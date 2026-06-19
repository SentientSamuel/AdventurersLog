import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Image, ActivityIndicator, Linking, useWindowDimensions, Keyboard,
  KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../constants/theme';

type MinigameType = 'Combat' | 'Skilling' | 'Combat & Skilling' | 'Miscellaneous';
type Safety = 'Safe' | 'Dangerous' | 'Non-combat';

type Minigame = {
  name:        string;
  type:        MinigameType;
  safety:      Safety;
  members:     boolean;
  location:    string;
  description: string;
  rewards:     string;
  wikiPage:    string;
};

const MINIGAMES: Minigame[] = [
  // Combat
  { name: 'Barbarian Assault', type: 'Combat', safety: 'Safe', members: true,
    location: 'Barbarian Outpost, Kandarin',
    description: 'A team of five players fight waves of Penance creatures, culminating in a fight against the Penance Queen. Each player takes one of four roles: Attacker, Collector, Defender, or Healer.',
    rewards: 'Honour Points — used for Fighter torso, Fighter hat, Penance skirt, Penance gloves, and Gambles.',
    wikiPage: 'Barbarian_Assault' },
  { name: 'Bounty Hunter', type: 'Combat', safety: 'Dangerous', members: false,
    location: 'Wilderness',
    description: 'Players are assigned a target in the Wilderness to hunt down and kill. Emblems are earned and can be upgraded by killing your target or other hunters.',
    rewards: 'Emblems for Bounty Hunter shop — various weapon and cosmetic upgrades.',
    wikiPage: 'Bounty_Hunter' },
  { name: 'Castle Wars', type: 'Combat', safety: 'Safe', members: false,
    location: 'South-west Kandarin',
    description: 'A team vs team minigame where two teams (Saradomin vs Zamorak) compete to capture the enemy\'s flag and bring it to their base. Lasts 20 minutes per game.',
    rewards: 'Castle Wars tickets for cosmetic armour sets (Gold, Silver, Iron).',
    wikiPage: 'Castle_Wars' },
  { name: 'Clan Wars', type: 'Combat', safety: 'Safe', members: false,
    location: 'Ferox Enclave, Wilderness',
    description: 'Clans challenge each other to PvP combat. Rules can be customised — weapon types, prayer, potions allowed, etc. Free-for-all option also available.',
    rewards: 'No direct rewards — purely for fun and clan rivalry.',
    wikiPage: 'Clan_Wars' },
  { name: 'Emir\'s Arena', type: 'Combat', safety: 'Dangerous', members: false,
    location: 'Al Kharid',
    description: 'Formerly the Duel Arena, now a PvP combat zone. Players can challenge others to staked or non-staked fights with customisable rules.',
    rewards: 'Staked items if staking is enabled.',
    wikiPage: 'Emir\'s_Arena' },
  { name: 'Last Man Standing', type: 'Combat', safety: 'Safe', members: false,
    location: 'Ferox Enclave / Edgeville',
    description: 'A battle-royale style minigame where players are dropped onto an island with random gear and must be the last one standing. Casual and Competitive modes available.',
    rewards: 'LMS points for cosmetics including Deadman armour ornament kits.',
    wikiPage: 'Last_Man_Standing' },
  { name: 'Nightmare Zone', type: 'Combat', safety: 'Safe', members: true,
    location: 'North of Yanille',
    description: 'Players fight bosses they have previously defeated in quests. One of the best AFK combat training methods. Supports Rumble (all bosses) and Practice modes.',
    rewards: 'Nightmare Zone points for herb boxes, imbued rings, combat potions. Best way to imbue Slayer helm, rings, and Crystal equipment.',
    wikiPage: 'Nightmare_Zone' },
  { name: 'Soul Wars', type: 'Combat', safety: 'Safe', members: true,
    location: 'Soul Wars Island (Edgeville portal)',
    description: 'Two teams (Red and Blue) compete to capture the soul obelisk and sacrifice souls to weaken the opponent\'s avatar. Team with most avatar kills wins.',
    rewards: 'Zeal Tokens for imbuing items, XP lamps, and cosmetics.',
    wikiPage: 'Soul_Wars' },
  // Skilling
  { name: 'Blast Furnace', type: 'Skilling', safety: 'Non-combat', members: true,
    location: 'Keldagrim, Fremennik Province',
    description: 'A team-run smelting operation where players work together to keep the furnace running. Requires only half the coal normally needed. Best Smithing XP in the game.',
    rewards: 'Bars smelted at half coal cost. Widely used for profit and XP.',
    wikiPage: 'Blast_Furnace' },
  { name: 'Fishing Trawler', type: 'Skilling', safety: 'Non-combat', members: true,
    location: 'Port Khazard, Kandarin',
    description: 'Players must keep a leaking trawler boat afloat by bailing water and fixing nets while it trawls for fish. Each game lasts 12 minutes.',
    rewards: 'Raw fish catch proportional to time kept afloat. Required for Angler\'s outfit.',
    wikiPage: 'Fishing_Trawler' },
  { name: 'Gnome Ball', type: 'Skilling', safety: 'Non-combat', members: true,
    location: 'Tree Gnome Stronghold',
    description: 'A simple ball sport where players attempt to score against a gnome goalkeeper. Grants Agility XP per successful score.',
    rewards: 'Agility XP and gnome ball.',
    wikiPage: 'Gnome_Ball' },
  { name: 'Gnome Restaurant', type: 'Skilling', safety: 'Non-combat', members: true,
    location: 'Grand Tree, Tree Gnome Stronghold',
    description: 'Players take food delivery orders from gnome customers, delivering specific dishes within a time limit using gnome transports.',
    rewards: 'Various item rewards, seeds, and the gnome deliveryman hat. Counts as a quest for 1 QP.',
    wikiPage: 'Gnome_Restaurant' },
  { name: 'Hallowed Sepulchre', type: 'Skilling', safety: 'Safe', members: true,
    location: 'Darkmeyer, Morytania',
    description: 'An Agility course in an undead dungeon with five increasingly difficult floors. Players navigate obstacles, loot coffins, and avoid traps from a moving skeleton.',
    rewards: 'Hallowed tokens for Strange old lockpick, Dark dye, Hallowed equipment. Best Agility XP in the game at 80+.',
    wikiPage: 'Hallowed_Sepulchre' },
  { name: 'Pyramid Plunder', type: 'Skilling', safety: 'Dangerous', members: true,
    location: 'Sophanem, Kharidian Desert',
    description: 'Players loot rooms of an ancient pyramid, searching urns and chests for artefacts. Each room has a time limit. Best Thieving XP from level 71+.',
    rewards: 'Pharaoh\'s sceptre, artefacts (noted), Thieving XP. Best XP method for high-level Thieving.',
    wikiPage: 'Pyramid_Plunder' },
  { name: 'Sorceress\'s Garden', type: 'Skilling', safety: 'Non-combat', members: true,
    location: 'Al Kharid',
    description: 'Players navigate through seasonal gardens (Summer/Autumn/Winter/Spring) avoiding elemental guards to pick sq\'irk fruits. Grants Thieving XP and sq\'irkade.',
    rewards: 'Thieving XP from sq\'irkade, Farming XP from fruit, sq\'irk juice.',
    wikiPage: 'Sorceress\'s_Garden' },
  { name: 'Tempoross', type: 'Skilling', safety: 'Safe', members: true,
    location: 'Ruins of Unkah, South of Al Kharid',
    description: 'A fishing-focused boss fight where players fish for raw fish to cook and use as ammunition against the Tempoross spirit. Best Fishing XP 35–70.',
    rewards: 'Reward pool for unique drops including Tackle box, Spirit angler outfit, harpoonfish.',
    wikiPage: 'Tempoross' },
  { name: 'Tithe Farm', type: 'Skilling', safety: 'Non-combat', members: true,
    location: 'Hosidius, Great Kourend',
    description: 'Players plant and grow seeds in a minigame environment against the clock. Grants Farming XP and points for the Farmer\'s outfit.',
    rewards: 'Farmer\'s outfit (5% more Farming XP), Herb sack, Bottomless compost bucket.',
    wikiPage: 'Tithe_Farm' },
  { name: 'Wintertodt', type: 'Skilling', safety: 'Dangerous', members: true,
    location: 'Great Kourend',
    description: 'Players work together to keep a magical fire lit to subdue the Wintertodt. Grants Firemaking XP and supply crates with random skilling rewards. Best way to 99 Firemaking.',
    rewards: 'Supply crates containing seeds, gems, logs, herbs, ore. Pyromancer outfit.',
    wikiPage: 'Wintertodt' },
  // Combat & Skilling
  { name: 'Pest Control', type: 'Combat & Skilling', safety: 'Safe', members: true,
    location: 'Void Knights\' Outpost',
    description: 'Teams defend the Void Knight while destroying portals and killing monsters. Available in three boat difficulties. One of the most popular minigames.',
    rewards: 'Void Knight equipment (Void Knight mace, melee/ranged/magic helms, body, legs, gloves) for combat XP lamps.',
    wikiPage: 'Pest_Control' },
  { name: 'Mage Training Arena', type: 'Combat & Skilling', safety: 'Non-combat', members: true,
    location: 'North of Duel Arena, Al Kharid',
    description: 'Four rooms test different aspects of Magic — Alchemy, Enchanting, Telekinetic, and Graveyard. Points earned unlock the best in slot magic equipment.',
    rewards: 'Pizazz points for Master wand, Mage\'s book, Infinity robes, Bryophyta\'s staff.',
    wikiPage: 'Mage_Training_Arena' },
  { name: 'Mahogany Homes', type: 'Skilling', safety: 'Non-combat', members: true,
    location: 'Various (Ardougne, Falador, Hosidius, Varrock)',
    description: 'Players receive contracts to repair furniture in NPC homes across Gielinor. Contracts scale with Construction level. Best Construction XP per coin spent.',
    rewards: 'Amy\'s saw, Plank sack, Carpenter\'s outfit, Construction XP.',
    wikiPage: 'Mahogany_Homes' },
  { name: 'Brimhaven Agility Arena', type: 'Skilling', safety: 'Dangerous', members: true,
    location: 'Brimhaven, Karamja',
    description: 'An obstacle course where players must reach the indicated obstacle before time runs out. Grants tickets for Agility XP and rewards.',
    rewards: 'Agility Arena tickets for XP and Pirate\'s hook.',
    wikiPage: 'Brimhaven_Agility_Arena' },
  { name: 'Trouble Brewing', type: 'Miscellaneous', safety: 'Non-combat', members: true,
    location: 'Mos Le\'Harmless',
    description: 'Two teams compete to brew more \'rum\' than their opponents using resources gathered from the island.',
    rewards: 'Pieces of Hate tokens for cosmetics including Crabclaw hook and Crabclaw isle.',
    wikiPage: 'Trouble_Brewing' },
];

const TYPE_COLORS: Record<MinigameType, string> = {
  'Combat':            theme.colors.redLight,
  'Skilling':          theme.colors.greenLight,
  'Combat & Skilling': '#c8a030',
  'Miscellaneous':     '#4a90d9',
};

const SAFETY_COLORS: Record<Safety, string> = {
  'Safe':       theme.colors.greenLight,
  'Dangerous':  theme.colors.redLight,
  'Non-combat': '#4a90d9',
};

// Wiki API 

const WIKI_API = 'https://oldschool.runescape.wiki/api.php';
const UA = 'AdventurersLog-App/1.0';
const _cache: Record<string, string> = {};

function extractWikitext(page: any): string {
  return page?.revisions?.[0]?.slots?.main?.['*'] ?? page?.revisions?.[0]?.['*'] ?? '';
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

type WikiSection = { index: number; name: string };

async function fetchSections(wikiPage: string): Promise<{ wikitext: string; sections: WikiSection[] }> {
  if (_cache[wikiPage]) {
    const wikitext = _cache[wikiPage];
    return { wikitext, sections: parseSections(wikitext) };
  }
  try {
    const url = `${WIKI_API}?action=query&prop=revisions&rvprop=content&rvslots=*&titles=${encodeURIComponent(wikiPage)}&format=json&origin=*`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const data = await res.json();
    const pages = data?.query?.pages ?? {};
    const page = Object.values(pages)[0] as any;
    const wikitext = extractWikitext(page);
    _cache[wikiPage] = wikitext;
    return { wikitext, sections: parseSections(wikitext) };
  } catch { return { wikitext: '', sections: [] }; }
}

const WANTED = ['reward', 'getting', 'strateg', 'how to', 'gameplay', 'overview', 'mechanics', 'points', 'role'];

function parseSections(wikitext: string): WikiSection[] {
  const out: WikiSection[] = [];
  let i = 0;
  for (const line of wikitext.split('\n')) {
    const m = line.match(/^(={2,4})\s*([^=]+?)\s*\1\s*$/);
    if (m) { i++; if (WANTED.some(w => m[2].toLowerCase().includes(w))) out.push({ index: i, name: m[2].trim() }); }
  }
  return out;
}

function extractSection(wikitext: string, targetIndex: number): string {
  const lines = wikitext.split('\n');
  let cur = 0, inSec = false, level = 2;
  const out: string[] = [];
  for (const line of lines) {
    const m = line.match(/^(={2,4})\s*([^=]+?)\s*\1\s*$/);
    if (m) {
      cur++;
      if (inSec && m[1].length <= level) break;
      if (cur === targetIndex) { inSec = true; level = m[1].length; continue; }
    }
    if (inSec) out.push(line);
  }
  return cleanWikitext(out.join('\n')) || 'No content available.';
}

// Background 

function StoneBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Image source={require('../assets/icons/osrs-bg-scale.png')} style={{ width, height }} resizeMode="cover" />
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject as any}>
        <Defs>
          <RadialGradient id="vigMini" cx="50%" cy="45%" r="70%">
            <Stop offset="0%" stopColor="#0d0900" stopOpacity="0.0" />
            <Stop offset="75%" stopColor="#0d0900" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0d0900" stopOpacity="0.92" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#vigMini)" />
      </Svg>
    </View>
  );
}

//  Expandable wiki section 

function WikiRow({ wikiPage, section }: { wikiPage: string; section: WikiSection }) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!expanded && content === null) {
      setLoading(true);
      const { wikitext } = await fetchSections(wikiPage);
      setContent(extractSection(wikitext, section.index));
      setLoading(false);
    }
    setExpanded(v => !v);
  };

  return (
    <View style={wsStyles.wrapper}>
      <TouchableOpacity style={wsStyles.header} onPress={toggle}>
        <Text style={wsStyles.title}>{section.name}</Text>
        {loading ? <ActivityIndicator color={theme.colors.gold} size="small" /> : <Text style={wsStyles.chevron}>{expanded ? '▾' : '▸'}</Text>}
      </TouchableOpacity>
      {expanded && content !== null && (
        <View style={wsStyles.body}><Text style={wsStyles.content}>{content}</Text></View>
      )}
    </View>
  );
}

const wsStyles = StyleSheet.create({
  wrapper: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 12, backgroundColor: theme.colors.panelLight },
  title: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchment, flex: 1 },
  chevron: { color: theme.colors.gold, fontSize: 20, marginLeft: 8 },
  body: { backgroundColor: theme.colors.background, padding: 12 },
  content: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchmentDim, lineHeight: 30 },
});

// Minigame detail 

function MinigameDetail({ mg }: { mg: Minigame }) {
  const [sections, setSections] = useState<WikiSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSections(mg.wikiPage).then(({ sections: s }) => { setSections(s); setLoading(false); });
  }, [mg.wikiPage]);

  return (
    <View style={mdStyles.container}>
      <View style={mdStyles.header}>
        <View style={{ flex: 1 }}>
          <Text style={mdStyles.name}>{mg.name}</Text>
          <View style={mdStyles.tagRow}>
            <View style={[mdStyles.tag, { borderColor: TYPE_COLORS[mg.type] }]}>
              <Text style={[mdStyles.tagText, { color: TYPE_COLORS[mg.type] }]}>{mg.type}</Text>
            </View>
            <View style={[mdStyles.tag, { borderColor: SAFETY_COLORS[mg.safety] }]}>
              <Text style={[mdStyles.tagText, { color: SAFETY_COLORS[mg.safety] }]}>{mg.safety}</Text>
            </View>
            <View style={mdStyles.tag}>
              <Text style={mdStyles.tagText}>{mg.members ? 'Members' : 'F2P'}</Text>
            </View>
          </View>
        </View>
      </View>

<View style={mdStyles.infoRow}>
  <View style={mdStyles.infoLabelRow}>
    <Image source={require('../assets/icons/compass.png')} style={mdStyles.compassIcon} />
    <Text style={mdStyles.infoLabel}>Location</Text>
  </View>
  <Text style={mdStyles.infoValue}>{mg.location}</Text>
</View>

      <Text style={mdStyles.description}>{mg.description}</Text>

      <View style={mdStyles.rewardBox}>
        <Text style={mdStyles.rewardLabel}>Rewards</Text>
        <Text style={mdStyles.rewardText}>{mg.rewards}</Text>
      </View>

      {loading ? (
        <View style={mdStyles.loadingRow}>
          <ActivityIndicator color={theme.colors.gold} size="small" />
          <Text style={mdStyles.loadingText}>Loading from wiki…</Text>
        </View>
      ) : sections.length > 0 ? (
        <View style={{ gap: 4 }}>
          <View style={mdStyles.divider}>
            <View style={mdStyles.divLine} />
            <View style={mdStyles.diamond} />
            <Text style={mdStyles.divLabel}>WIKI GUIDE</Text>
            <View style={mdStyles.diamond} />
            <View style={mdStyles.divLine} />
          </View>
          {sections.map(s => <WikiRow key={s.index} wikiPage={mg.wikiPage} section={s} />)}
        </View>
      ) : null}

      <TouchableOpacity style={mdStyles.wikiBtn} onPress={() => Linking.openURL(`https://oldschool.runescape.wiki/w/${mg.wikiPage}`)}>
        <Text style={mdStyles.wikiBtnText}>Open full wiki page  ▸</Text>
      </TouchableOpacity>
    </View>
  );
}

const mdStyles = StyleSheet.create({
  container: { backgroundColor: theme.colors.panel, borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 4, padding: 14, marginTop: 10, gap: 12 },
  header: { flexDirection: 'row', gap: 10 },
  name: { fontFamily: theme.fonts.display, fontSize: 25, paddingBottom: 10, color: theme.colors.parchment, includeFontPadding: false },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  tag: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: theme.colors.background },
  tagText: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.parchmentDim },
  infoRow: { gap: 3 },
  infoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, },
  compassIcon: { width: 30, height: 30 },
  infoLabel: { fontFamily: theme.fonts.display, fontSize: 21, paddingBottom: 10, paddingTop: 10, color: theme.colors.gold, letterSpacing: 1 },
  infoValue: { paddingTop: 10, fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchment, lineHeight: 20 },
  description: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchmentDim, lineHeight: 29 },
  rewardBox: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, padding: 10, gap: 4 },
  rewardLabel: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.goldLight, letterSpacing: 1, textTransform: 'uppercase' },
  rewardText: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.parchmentDim, lineHeight: 27 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.textMuted },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  divLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  diamond: { width: 5, height: 5, backgroundColor: theme.colors.gold, transform: [{ rotate: '45deg' }] },
  divLabel: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.goldDim, letterSpacing: 2 },
  wikiBtn: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, paddingVertical: 10, alignItems: 'center' },
  wikiBtnText: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.parchmentDim },
});

// Minigame row

function MinigameRow({ mg, selected, onPress }: { mg: Minigame; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[mrStyles.row, selected && mrStyles.rowSelected]} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={mrStyles.name}>{mg.name}</Text>
        <Text style={[mrStyles.type, { color: TYPE_COLORS[mg.type] }]}>{mg.type}</Text>
      </View>
      <View style={mrStyles.right}>
        <Text style={[mrStyles.safety, { color: SAFETY_COLORS[mg.safety] }]}>{mg.safety}</Text>
        <Text style={mrStyles.members}>{mg.members ? 'Members' : 'F2P'}</Text>
      </View>
    </TouchableOpacity>
  );
}

const mrStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 10 },
  rowSelected: { backgroundColor: theme.colors.panelLight },
  name: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.parchment },
  type: { fontFamily: theme.fonts.display, fontSize: 16, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 3 },
  safety: { fontFamily: theme.fonts.display, fontSize: 16 },
  members: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.textMuted },
});

// Filter bar

type MGFilter = 'All' | 'Combat' | 'Skilling' | 'Combat & Skilling' | 'Miscellaneous' | 'F2P';

function FilterBar({ active, onChange }: { active: MGFilter; onChange: (f: MGFilter) => void }) {
  const filters: MGFilter[] = ['All', 'Combat', 'Skilling', 'Combat & Skilling', 'Miscellaneous', 'F2P'];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', gap: 6, paddingTop: 8 }}>
        {filters.map(f => (
          <TouchableOpacity key={f} style={[fbStyles.chip, active === f && fbStyles.chipActive]} onPress={() => onChange(f)}>
            <Text style={[fbStyles.text, active === f && fbStyles.textActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const fbStyles = StyleSheet.create({
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 3, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.panel },
  chipActive: { borderColor: theme.colors.borderGold, backgroundColor: theme.colors.panelLight },
  text: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.parchmentDim },
  textActive: { color: theme.colors.goldLight },
});

// Main Screen

export default function MinigamesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MGFilter>('All');
  const [selected, setSelected] = useState<Minigame | null>(null);

  const filtered = MINIGAMES.filter(mg => {
    if (search && !mg.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'F2P') return !mg.members;
    if (filter === 'All') return true;
    return mg.type === filter;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}>
          <Pressable onPress={Keyboard.dismiss}>

            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>← Home</Text>
              </TouchableOpacity>
              <View style={styles.ornamentRow}>
                <View style={styles.ornamentLine} /><Text style={styles.ornamentSymbol}>✦</Text>
                <Text style={styles.ornamentLabel}>Old School RuneScape</Text>
                <Text style={styles.ornamentSymbol}>✦</Text><View style={styles.ornamentLine} />
              </View>
              <Text style={styles.screenTitle}>Minigames</Text>
              <View style={styles.taglineRow}>
                <View style={styles.ornamentLine} /><Text style={styles.ornamentSymbol}>✦</Text>
                <Text style={styles.screenSubtitle}>Activities & Rewards</Text>
                <Text style={styles.ornamentSymbol}>✦</Text><View style={styles.ornamentLine} />
              </View>
            </View>

            {selected && (
              <View style={styles.section}>
                <TouchableOpacity style={styles.backToCats} onPress={() => setSelected(null)}>
                  <Text style={styles.backToCatsText}>← Back to list</Text>
                </TouchableOpacity>
                <View style={styles.sectionHeader}>
                  <View style={styles.ornamentLine} /><View style={styles.diamond} />
                  <Text style={styles.sectionTitle}>Minigame Detail</Text>
                  <View style={styles.diamond} /><View style={styles.ornamentLine} />
                </View>
                <MinigameDetail mg={selected} />
              </View>
            )}

            <View style={styles.section}>

              <TextInput style={styles.searchInput} placeholder="Search minigames…"
                placeholderTextColor={theme.colors.textMuted} value={search}
                onChangeText={setSearch} autoCorrect={false} autoCapitalize="none" />
              <FilterBar active={filter} onChange={setFilter} />
              <Text style={styles.count}>{filtered.length} minigames</Text>
              <View style={styles.list}>
                {filtered.map(mg => (
                  <MinigameRow key={mg.name} mg={mg} selected={selected?.name === mg.name}
                    onPress={() => { setSelected(selected?.name === mg.name ? null : mg); Keyboard.dismiss(); }} />
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
  header: { alignItems: 'center', paddingTop: 10, paddingBottom: 6, marginBottom: 12, gap: 8 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 4, paddingBottom: 10 },
  backButtonText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.gold, letterSpacing: 0.5 },
  screenTitle: { fontFamily: theme.fonts.display, fontSize: 34, color: theme.colors.gold, letterSpacing: 1, textShadowColor: 'rgba(200,160,48,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12, includeFontPadding: false, lineHeight: 42 },
  screenSubtitle: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.parchmentDim, fontStyle: 'italic', letterSpacing: 1, includeFontPadding: false },
  ornamentRow: { flexDirection: 'row', alignItems: 'center', width: '90%', gap: 6 },
  taglineRow: { marginBottom: 10, flexDirection: 'row', alignItems: 'center', width: '90%', gap: 6 },
  ornamentLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  ornamentSymbol: { color: theme.colors.goldDim, fontSize: 10 },
  ornamentLabel: { fontFamily: theme.fonts.display, fontSize: 11, color: theme.colors.goldDim, letterSpacing: 3, textTransform: 'uppercase', includeFontPadding: false },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  diamond: { width: 6, height: 6, backgroundColor: theme.colors.gold, transform: [{ rotate: '45deg' }], flexShrink: 0 },
  sectionTitle: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight, letterSpacing: 2, textTransform: 'uppercase', includeFontPadding: false },
  searchInput: { borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 3, backgroundColor: theme.colors.background, paddingHorizontal: 14, paddingVertical: 12, fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchment, marginBottom: 4 },
  count: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.textMuted, paddingTop: 8, marginBottom: 10 },
  list: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, backgroundColor: theme.colors.panel, overflow: 'hidden' },
  backToCats: { marginBottom: 20 },
  backToCatsText: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.gold },
});
