import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, useWindowDimensions,
} from 'react-native';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../constants/theme';

// Guide content

type Tip = { heading?: string; body: string };
type Section = { title: string; icon: string; tips: Tip[] };

const GUIDE_SECTIONS: Section[] = [
  {
    title: 'Tutorial Island',
    icon: '',
    tips: [
      {
        heading: 'Where it all begins',
        body: 'All new accounts start on Tutorial Island, which teaches basic controls and gameplay mechanics. You\'ll customise your character — don\'t stress about the look, you can get a makeover later.',
      },
      {
        heading: 'Tell the Gielinor Guide you\'re new',
        body: 'Talk to the Gielinor Guide (the first NPC you meet) and tell him you\'re new or returning. This unlocks the Adventure Paths system, which gives you early goals and useful rewards.',
      },
      {
        heading: 'Ironman Mode',
        body: 'During the tutorial you\'ll meet Paul, who offers Ironman modes — restrictions that make the game harder. Regular Ironman can\'t trade other players. Ultimate Ironman can\'t use banks either. Hardcore Ironman gets one life. You can revert later but there\'s a 7-day delay.',
      },
    ],
  },
  {
    title: 'Trade Restrictions',
    icon: '',
    tips: [
      {
        heading: 'New accounts are restricted at first',
        body: 'New accounts can\'t sell certain commonly-botted items on the Grand Exchange. This restriction lifts once you have 20+ hours of playtime, a skill total of 100+, and 10+ Quest Points.',
      },
      {
        heading: 'Quick quests to unlock trading',
        body: 'To get your 10 Quest Points quickly, complete: Sheep Shearer, Cook\'s Assistant, X Marks the Spot, Pirate\'s Treasure, and Romeo & Juliet. All are short beginner quests near Lumbridge.',
      },
    ],
  },
  {
    title: 'I\'m in Lumbridge — What Now?',
    icon: '',
    tips: [
      {
        heading: 'Adventure Paths',
        body: 'Look for Adventurer Jon just north of the Lumbridge castle gates. He introduces the Adventure Paths system, which rewards you for hitting early milestone levels in combat and gathering skills. He\'ll also give you a Combat starter kit.',
      },
      {
        heading: 'Start questing',
        body: 'Quests are the heart of OSRS. There are 24 free-to-play quests and over 150 for members. Look for the quest scroll icon on the world map to find quest start points, or check the Quests tab in this app.',
      },
      {
        heading: 'Train your skills',
        body: 'You start with 15 free-to-play skills (24 with membership including Sailing). The more you train, the more content unlocks. Even a few minutes of skilling here and there adds up quickly.',
      },
      {
        heading: 'Just explore',
        body: 'OSRS is an open world — everyone has their own playstyle. Some people quest, some skill, some PvM, some PvP. Walk around, talk to NPCs, and find what you enjoy most.',
      },
    ],
  },
  {
    title: 'Account Security',
    icon: '',
    tips: [
      {
        heading: 'Use a Jagex Account',
        body: 'The Jagex Account system combines all your accounts into one with two-factor authentication via email or an authenticator app. It\'s the most secure way to log in. Visit account.jagex.com to manage your security settings.',
      },
      {
        heading: 'Set a Bank PIN',
        body: 'Set a Bank PIN immediately — it adds a 4-digit code before anyone can access your bank. Even if someone gets your password, they can\'t take your items without the PIN.',
      },
      {
        heading: 'Watch out for scams',
        body: 'Common scams include: fake doubling money offers, "drop parties", item trimming scams, and fake staff impersonation. Jagex will NEVER ask for your password. If it sounds too good to be true, it is.',
      },
      {
        heading: 'Luring',
        body: 'Some players try to "lure" you into the Wilderness (a dangerous PvP area) where they can kill you and take your items. Be very cautious about following strangers who offer rewards.',
      },
    ],
  },
  {
    title: 'Gameplay Basics',
    icon: '',
    tips: [
      {
        heading: 'The World Map',
        body: 'Press M or tap the map icon to open the world map. Gielinor is huge — key early locations include Lumbridge (starting area), Varrock (big city to the north), Al Kharid (desert to the east), and Falador (north-west city).',
      },
      {
        heading: 'Run Energy',
        body: 'You can run or walk. Running drains run energy, which regenerates over time. Weight affects how fast it drains — lighter equipment means you can run longer. Stamina potions and the Agility skill help restore energy faster.',
      },
      {
        heading: 'Combat styles',
        body: 'There are three combat styles: Melee (Attack, Strength, Defence), Ranged (bows, crossbows, throwing weapons), and Magic (spells using runes). Your Combat Level is calculated from all three. Most early players focus on Melee.',
      },
      {
        heading: 'Combat experience',
        body: 'Each combat style gives XP differently. "Controlled" attack style spreads XP across Attack, Strength, and Defence. "Aggressive" focuses on Strength for higher max hits. Choose based on what you want to level.',
      },
      {
        heading: 'Death',
        body: 'When you die in most places you respawn in Lumbridge and lose your items, but keep your three most valuable. A gravestone appears at the death location and you have a few minutes to retrieve the rest. In the Wilderness, other players can take your dropped items.',
      },
      {
        heading: 'Equipment stats',
        body: 'Gear has attack and defence bonuses. Melee gear comes in Bronze → Iron → Steel → Black → Mithril → Adamant → Rune → Dragon. Always wear the best armour you can afford and have the stats for.',
      },
    ],
  },
  {
    title: 'Early Activities (Beginner)',
    icon: '',
    tips: [
      {
        heading: 'Cut trees in Lumbridge',
        body: 'Grab a bronze axe from your inventory (or buy one) and chop trees around Lumbridge. Great for Woodcutting XP and making some starter cash by selling the logs.',
      },
      {
        heading: 'Kill chickens',
        body: 'The chicken farm east of Lumbridge (across the river) is the best beginner combat spot. Chickens drop feathers (useful for Fishing and Fletching) and raw chicken. Low risk, decent early XP.',
      },
      {
        heading: 'Kill cows in Lumbridge',
        body: 'The cow field north-east of Lumbridge is a great step up from chickens. Cowhides sell on the Grand Exchange for decent early money. This is one of the best beginner money makers.',
      },
      {
        heading: 'Fish shrimps in Lumbridge Swamp',
        body: 'Head to the swamp south of Lumbridge with a small fishing net. Shrimps and anchovies give Fishing XP and can be cooked for Cooking XP. A great two-for-one early grind.',
      },
      {
        heading: 'Complete the Stronghold of Security',
        body: 'In Barbarian Village (west of Varrock), the Stronghold of Security is a dungeon with four levels. It\'s mainly a security quiz. Completion gives you 10,000 coins and some boots — massive early game cash reward.',
      },
      {
        heading: 'Mine and smith ores',
        body: 'Mine copper and tin ore (both needed to smelt bronze bars) from the Lumbridge mine. Smith them into bronze items at a furnace. Good for both Mining and Smithing XP and another good early money maker.',
      },
    ],
  },
  {
    title: 'Intermediate Activities',
    icon: '',
    tips: [
      {
        heading: 'Train on Al Kharid warriors',
        body: 'The Al Kharid palace (south-east of Lumbridge, costs 10gp toll or do Prince Ali Rescue first) has guards that are great for combat training. They respawn quickly and drop coins.',
      },
      {
        heading: 'Kill Hill Giants',
        body: 'Hill Giants in the Edgeville Dungeon drop Big Bones (worth good money on the GE) and are great combat XP. Bring a brass key to enter. Recommended combat level: 30+.',
      },
      {
        heading: 'Fly fishing',
        body: 'At Barbarian Village (or Lumbridge), fly fish for trout and salmon using a fly fishing rod and feathers. One of the fastest early Fishing XP methods and good Cooking XP too.',
      },
      {
        heading: 'Buy from the Grand Exchange',
        body: 'Once your trade restrictions lift, the Grand Exchange in Varrock is your best friend. Buy better gear, sell drops, and check prices on valuable items. You can also use the GE tab in this app.',
      },
    ],
  },
  {
    title: 'Advanced Activities',
    icon: '',
    tips: [
      {
        heading: 'Cut yew trees',
        body: 'At level 60 Woodcutting, yew logs become one of the best money-making skills in free-to-play. Good yew spots are south of Falador, Edgeville, and Varrock castle. Expect 30–50k gp/hour.',
      },
      {
        heading: 'Mine in the Mining Guild',
        body: 'Requires level 60 Mining. Located in Falador. Contains lots of coal rocks (good money) and some gold, mithril, and adamantite rocks. A staple F2P money maker.',
      },
      {
        heading: 'Slayer (Members only)',
        body: 'Slayer is one of the most popular members skills. A Slayer master assigns you a creature to kill, and you earn Slayer XP on top of combat XP. Unlocks access to powerful monsters like Abyssal demons and Cave krakens.',
      },
      {
        heading: 'Player vs Player (Wilderness)',
        body: 'The Wilderness is a large northern zone where other players can attack you. Items lost on death can be taken by the killer. Getting "skulled" (attacking first) means you lose all items on death, not just the bottom items. Enter with caution and only what you\'re willing to lose.',
      },
    ],
  },
  {
    title: 'Membership — Is It Worth It?',
    icon: '',
    tips: [
      {
        heading: 'What membership adds',
        body: 'Members get 9 additional skills (Slayer, Herblore, Agility, Thieving, Farming, Fletching, Hunter, Construction, Sailing), 155 more quests, a much larger world, and access to the best money-making methods and bosses.',
      },
      {
        heading: 'When to get it',
        body: 'You don\'t need membership straight away. Free-to-play has plenty of early content to keep you busy. Most players recommend getting membership once you\'ve completed most F2P quests and have solid combat stats (50+ in your preferred style).',
      },
      {
        heading: 'Bond system',
        body: 'If you don\'t want to pay real money, you can buy Bonds on the Grand Exchange using in-game gold. Bonds can be redeemed for membership. They\'re expensive (around 6–8m gp each) but it\'s a legitimate way to play for free long-term.',
      },
    ],
  },
  {
    title: 'Useful Tips & Tricks',
    icon: '',
    tips: [
      {
        heading: 'Always have food',
        body: 'Bread, shrimps, and chicken are cheap early food. Lobsters and swordfish are mid-game staples. Sharks are end-game. Never go into combat you\'re unsure about without healing items.',
      },
      {
        heading: 'Use the wiki',
        body: 'The OSRS Wiki (oldschool.runescape.wiki) is the single best resource in the game. Almost every item, monster, quest, and mechanic is documented there. Check it constantly when you\'re unsure of something.',
      },
      {
        heading: 'Prayer is powerful',
        body: 'Protect from Melee (43 Prayer), Protect from Missiles (40 Prayer), and Protect from Magic (37 Prayer) make you nearly immune to that combat style. These prayers are game-changing for bossing and dangerous areas.',
      },
      {
        heading: 'Save your Quest Points',
        body: 'Quest Points (QP) unlock things — notably the Heroes\' Quest (55 QP), Legends\' Quest (107 QP), and eventually the Quest Cape (333 QP). Quests also give great XP rewards, often better than hours of grinding.',
      },
      {
        heading: 'Don\'t drop everything',
        body: 'Many items that seem like junk are worth money on the GE or useful for quests. Feathers, big bones, clue scrolls, and various drops all have value. When in doubt, look it up on the GE tab.',
      },
      {
        heading: 'Join a clan or Discord',
        body: 'OSRS has a huge community. Joining a friendly clan or the r/2007scape Discord is a great way to get advice, find others to play with, and stay motivated. The game is more fun with friends.',
      },
    ],
  },
  {
    title: 'Servers & Worlds',
    icon: '',
    tips: [
      {
        heading: 'All worlds share your progress',
        body: 'You can log into any world and your character is exactly the same. Pick the world with the lowest ping to your location. Your progress syncs across PC and mobile too.',
      },
      {
        heading: 'World types',
        body: 'Silver star = F2P world (members content disabled). Gold star = Members world. Red star = PvP world (dangerous, players can attack anywhere). Avoid red worlds until you know what you\'re doing.',
      },
      {
        heading: 'High-population worlds',
        body: 'Some activities (like the Grand Exchange, minigames, or group bosses) work better on busier worlds. World 301 is the GE trading hub. World 308 is popular for activities like Blast Furnace.',
      },
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
          <RadialGradient id="vigGuide" cx="50%" cy="45%" r="70%">
            <Stop offset="0%"   stopColor="#0d0900" stopOpacity="0.0" />
            <Stop offset="75%"  stopColor="#0d0900" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0d0900" stopOpacity="0.92" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#vigGuide)" />
      </Svg>
    </View>
  );
}

// Expandable Section

function GuideSection({ section }: { section: Section }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={secStyles.wrapper}>
      <TouchableOpacity style={secStyles.header} onPress={() => setExpanded((v) => !v)}>
        <View style={secStyles.headerLeft}>
          <Text style={secStyles.icon}>{section.icon}</Text>
          <Text style={secStyles.title}>{section.title}</Text>
        </View>
        <Text style={secStyles.chevron}>{expanded ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={secStyles.body}>
          {section.tips.map((tip, i) => (
            <View key={i} style={[secStyles.tip, i < section.tips.length - 1 && secStyles.tipBorder]}>
              {tip.heading && <Text style={secStyles.tipHeading}>{tip.heading}</Text>}
              <Text style={secStyles.tipBody}>{tip.body}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const secStyles = StyleSheet.create({
  wrapper: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 14, backgroundColor: theme.colors.panel },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  icon: { fontSize: 20 },
  title: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.parchment, flex: 1 },
  chevron: { color: theme.colors.gold, fontSize: 20 },
  body: { backgroundColor: theme.colors.background, padding: 14, gap: 0 },
  tip: { paddingBottom: 14, marginBottom: 14 },
  tipBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tipHeading: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight, marginBottom: 5, includeFontPadding: false },
  tipBody: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchmentDim, lineHeight: 28 },
});

// Main Screen

export default function NewPlayerGuideScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
          <Text style={styles.screenTitle}>New Player Guide</Text>
          <View style={styles.taglineRow}>
            <View style={styles.ornamentLine} />
            <Text style={styles.ornamentSymbol}>✦</Text>
            <Text style={styles.screenSubtitle}>Begin Your Adventure</Text>
            <Text style={styles.ornamentSymbol}>✦</Text>
            <View style={styles.ornamentLine} />
          </View>
        </View>

        {/* Intro */}
        <View style={styles.introBox}>
          <Text style={styles.introText}>
            Welcome to Gielinor! This guide covers everything you need to know to get started in Old School RuneScape — from Tutorial Island to your first 99. Tap any section to expand it.
          </Text>
        </View>

        {/* Sections */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.ornamentLine} />
            <View style={styles.diamond} />
            <Text style={styles.sectionTitle}>Guide Sections</Text>
            <View style={styles.diamond} />
            <View style={styles.ornamentLine} />
          </View>
          {GUIDE_SECTIONS.map((s) => (
            <GuideSection key={s.title} section={s} />
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
  screenTitle: { fontFamily: theme.fonts.display, fontSize: 34, color: theme.colors.gold, letterSpacing: 1, textShadowColor: 'rgba(200,160,48,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12, includeFontPadding: false, lineHeight: 42, textAlign: 'center' },
  screenSubtitle: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.parchmentDim, fontStyle: 'italic', letterSpacing: 1, includeFontPadding: false },
  ornamentRow: { flexDirection: 'row', alignItems: 'center', width: '90%', gap: 6 },
  taglineRow: { flexDirection: 'row', alignItems: 'center', width: '90%', gap: 6 },
  ornamentLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  ornamentSymbol: { color: theme.colors.goldDim, fontSize: 10 },
  ornamentLabel: { fontFamily: theme.fonts.display, fontSize: 11, color: theme.colors.goldDim, letterSpacing: 3, textTransform: 'uppercase', includeFontPadding: false },

  introBox: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderGold, borderRadius: 4, padding: 14, marginBottom: 20 },
  introText: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchmentDim, lineHeight: 27 },

  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  diamond: { width: 6, height: 6, backgroundColor: theme.colors.gold, transform: [{ rotate: '45deg' }], flexShrink: 0 },
  sectionTitle: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight, letterSpacing: 2, textTransform: 'uppercase', includeFontPadding: false },
});
