import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Image, Linking, useWindowDimensions, Keyboard,
  KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../constants/theme';

type Calc = { name: string; description: string; wikiPage: string };
type CalcCategory = { name: string; icon: any; calcs: Calc[] };

const CATEGORIES: CalcCategory[] = [
  {
    name: 'Combat', icon: require('../assets/icons/combat.png'),
    calcs: [
      { name: 'Max Hit', description: 'Calculate your max hit for melee, ranged, or magic', wikiPage: 'Calculator:Max_Hit' },
      { name: 'Combat Level', description: 'Calculate your combat level from your skill stats', wikiPage: 'Calculator:Combat_level' },
      { name: 'Damage per Second (DPS)', description: 'Compare weapons and gear setups by DPS', wikiPage: 'Calculator:DPS' },
      { name: 'TzHaar Fight Cave', description: 'Estimate time and supplies for the Fight Cave', wikiPage: 'Calculator:TzHaar_Fight_Cave' },
      { name: 'Slayer XP', description: 'Calculate Slayer XP per task and time to level', wikiPage: 'Calculator:Slayer' },
    ],
  },
  {
    name: 'Skilling', icon: require('../assets/icons/skilling.png'),
    calcs: [
      { name: 'Agility', description: 'Laps needed from current level to goal', wikiPage: 'Calculator:Agility' },
      { name: 'Construction', description: 'Items needed to reach Construction goal', wikiPage: 'Calculator:Construction' },
      { name: 'Cooking', description: 'Food to cook from current level to goal', wikiPage: 'Calculator:Cooking' },
      { name: 'Crafting', description: 'Items needed from current level to goal', wikiPage: 'Calculator:Crafting' },
      { name: 'Farming', description: 'Crops needed to reach Farming goal', wikiPage: 'Calculator:Farming' },
      { name: 'Herb farming profit', description: 'Profit and XP per herb run', wikiPage: 'Calculator:Farming/Herbs' },
      { name: 'Firemaking', description: 'Logs needed from current level to goal', wikiPage: 'Calculator:Firemaking' },
      { name: 'Fishing', description: 'Fish needed from current level to goal', wikiPage: 'Calculator:Fishing' },
      { name: 'Fletching', description: 'Items needed from current level to goal', wikiPage: 'Calculator:Fletching' },
      { name: 'Herblore', description: 'Potions needed from current level to goal', wikiPage: 'Calculator:Herblore' },
      { name: 'Hunter', description: 'Creatures needed from current level to goal', wikiPage: 'Calculator:Hunter' },
      { name: 'Magic', description: 'Spells to cast from current level to goal', wikiPage: 'Calculator:Magic' },
      { name: 'Mining', description: 'Ores needed from current level to goal', wikiPage: 'Calculator:Mining' },
      { name: 'Prayer', description: 'Bones needed from current level to goal', wikiPage: 'Calculator:Prayer' },
      { name: 'Runecraft', description: 'Runes to craft from current level to goal', wikiPage: 'Calculator:Runecraft' },
      { name: 'Smithing', description: 'Bars to smelt/items to smith for goal', wikiPage: 'Calculator:Smithing' },
      { name: 'Thieving', description: 'Pickpockets/stalls needed to reach goal', wikiPage: 'Calculator:Thieving' },
      { name: 'Woodcutting', description: 'Logs to chop from current level to goal', wikiPage: 'Calculator:Woodcutting' },
    ],
  },
  {
    name: 'Profit & Loss', icon: require('../assets/icons/profit.png'),
    calcs: [
      { name: 'Cooking fish', description: 'Profit/loss from cooking bought raw fish', wikiPage: 'Calculator:Cooking/Fish' },
      { name: 'Herblore potions', description: 'Cost/profit from making potions', wikiPage: 'Calculator:Herblore/Potions' },
      { name: 'Blast Furnace bars', description: 'Profit from smelting bars at Blast Furnace', wikiPage: 'Calculator:Smithing/Smelting' },
      { name: 'Fletching darts', description: 'Profit/loss from making darts', wikiPage: 'Calculator:Fletching/Darts' },
      { name: 'Gem cutting', description: 'Profit from cutting gems', wikiPage: 'Calculator:Crafting/Gem_cutting' },
      { name: 'Tanning hides', description: 'Profit per hide tanned', wikiPage: 'Calculator:Crafting/Tanning_hides' },
      { name: 'Crafting battlestaves', description: 'Profit from making battlestaves', wikiPage: 'Calculator:Crafting/Battlestaves' },
      { name: 'High Level Alchemy', description: 'Best items to alch for profit', wikiPage: 'Calculator:Magic/High_Level_Alchemy' },
      { name: 'Brewing ale', description: 'Profit/loss from brewing ales', wikiPage: 'Calculator:Cooking/Brewing' },
      { name: 'Construction materials', description: 'Cost per XP for Construction items', wikiPage: 'Calculator:Construction/Materials' },
    ],
  },
  {
    name: 'Efficiency', icon: require('../assets/icons/efficiency.png'),
    calcs: [
      { name: 'Efficiency method comparison', description: 'Compare two training methods by efficiency', wikiPage: 'Calculator:Efficiency_method_comparison' },
      { name: 'Genie lamps & books', description: 'Lamps/books needed to reach target level', wikiPage: 'Calculator:Genie_lamps_and_Books_of_knowledge' },
      { name: 'XP per hour comparison', description: 'Compare XP rates across different methods', wikiPage: 'Calculator:Efficiency_ratio' },
      { name: 'Quests XP rewards', description: 'Quest XP rewards by skill', wikiPage: 'Optimal_quest_guide' },
    ],
  },
  {
    name: 'Bosses & Raids', icon: require('../assets/icons/bosses.png'),
    calcs: [
      { name: 'Chambers of Xeric points', description: 'Estimate CoX points and unique chance', wikiPage: 'Calculator:Chambers_of_Xeric' },
      { name: 'Theatre of Blood', description: 'Estimate ToB kill times and supplies', wikiPage: 'Calculator:Theatre_of_Blood' },
      { name: 'Grotesque Guardians', description: 'Kills and supplies for Gargoyle boss', wikiPage: 'Calculator:Grotesque_Guardians' },
    ],
  },
  {
    name: 'Random & Other', icon: require('../assets/icons/random.png'),
    calcs: [
      { name: 'Drop rate calculator', description: 'Probability of a drop after N kills', wikiPage: 'Calculator:Drop_rate' },
      { name: 'Pet chance', description: 'Probability of receiving a boss/skilling pet', wikiPage: 'Calculator:Pet_chances' },
      { name: 'Barrows rewards', description: 'Probability of specific Barrows equipment', wikiPage: 'Calculator:Barrows_rewards' },
      { name: 'Bird nest contents', description: 'Expected contents from bird nests', wikiPage: 'Calculator:Bird_nest_drops' },
      { name: 'Clue scroll rewards', description: 'Expected value from clue scrolls', wikiPage: 'Calculator:Treasure_Trails' },
    ],
  },
];

function StoneBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Image source={require('../assets/icons/osrs-bg-scale.png')} style={{ width, height }} resizeMode="cover" />
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject as any}>
        <Defs>
          <RadialGradient id="vigCalc" cx="50%" cy="45%" r="70%">
            <Stop offset="0%" stopColor="#0d0900" stopOpacity="0.0" />
            <Stop offset="75%" stopColor="#0d0900" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0d0900" stopOpacity="0.92" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#vigCalc)" />
      </Svg>
    </View>
  );
}

function CalcRow({ calc }: { calc: Calc }) {
  return (
    <TouchableOpacity
      style={crStyles.row}
      onPress={() => Linking.openURL(`https://oldschool.runescape.wiki/w/${calc.wikiPage}`)}
    >
      <View style={{ flex: 1 }}>
        <Text style={crStyles.name}>{calc.name}</Text>
        <Text style={crStyles.desc}>{calc.description}</Text>
      </View>
      <Text style={crStyles.arrow}>▸</Text>
    </TouchableOpacity>
  );
}

const crStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 10 },
  name: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchment },
  desc: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.textMuted, marginTop: 2, lineHeight: 26, paddingTop: 5 },
  arrow: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.gold },
});

function CategoryCard({ cat, expanded, onToggle }: { cat: CalcCategory; expanded: boolean; onToggle: () => void }) {
  return (
    <View style={ccStyles.card}>
      <TouchableOpacity style={ccStyles.header} onPress={onToggle}>
        <Image source={cat.icon} style={ccStyles.icon} resizeMode="contain" />
        <Text style={ccStyles.name}>{cat.name}</Text>
        <Text style={ccStyles.count}>{cat.calcs.length} calculators</Text>
        <Text style={ccStyles.chevron}>{expanded ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={ccStyles.body}>
          {cat.calcs.map(c => <CalcRow key={c.wikiPage} calc={c} />)}
        </View>
      )}
    </View>
  );
}

const ccStyles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 8, backgroundColor: theme.colors.panel },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  icon: { width: 28, height: 28 },
  name: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchment, flex: 1 },
  count: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.textMuted },
  chevron: { color: theme.colors.gold, fontSize: 20, marginLeft: 4 },
  body: { backgroundColor: theme.colors.background, borderTopWidth: 1, borderTopColor: theme.colors.border },
});

export default function CalculatorsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const allCalcs = CATEGORIES.flatMap(c => c.calcs.map(calc => ({ ...calc, category: c.name })));
  const searchResults = search.trim()
    ? allCalcs.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        c.category.toLowerCase().includes(search.toLowerCase())
      )
    : [];

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
              <Text style={styles.screenTitle}>Calculators</Text>
              <View style={styles.taglineRow}>
                <View style={styles.ornamentLine} /><Text style={styles.ornamentSymbol}>✦</Text>
                <Text style={styles.screenSubtitle}>XP, Profit & More</Text>
                <Text style={styles.ornamentSymbol}>✦</Text><View style={styles.ornamentLine} />
              </View>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                All calculators open the OSRS Wiki, which uses live Grand Exchange prices and is always up to date. Tap any calculator to open it.
              </Text>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.ornamentLine} /><View style={styles.diamond} />
                <Text style={styles.sectionTitle}>Search</Text>
                <View style={styles.diamond} /><View style={styles.ornamentLine} />
              </View>
              <TextInput style={styles.searchInput} placeholder="Search calculators…"
                placeholderTextColor={theme.colors.textMuted} value={search}
                onChangeText={setSearch} autoCorrect={false} autoCapitalize="none" />

              {searchResults.length > 0 && (
                <View style={styles.list}>
                  {searchResults.map(c => (
                    <TouchableOpacity key={c.wikiPage} style={srStyles.row}
                      onPress={() => Linking.openURL(`https://oldschool.runescape.wiki/w/${c.wikiPage}`)}>
                      <View style={{ flex: 1 }}>
                        <Text style={srStyles.name}>{c.name}</Text>
                        <Text style={srStyles.cat}>{c.category} · {c.description}</Text>
                      </View>
                      <Text style={srStyles.arrow}>↗</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {!search && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.ornamentLine} /><View style={styles.diamond} />
                  <Text style={styles.sectionTitle}>Browse</Text>
                  <View style={styles.diamond} /><View style={styles.ornamentLine} />
                </View>
                {CATEGORIES.map(cat => (
                  <CategoryCard key={cat.name} cat={cat}
                    expanded={expanded === cat.name}
                    onToggle={() => setExpanded(expanded === cat.name ? null : cat.name)} />
                ))}
                <TouchableOpacity style={styles.allCalcsBtn}
                  onPress={() => Linking.openURL('https://oldschool.runescape.wiki/w/Calculators')}>
                  <Text style={styles.allCalcsBtnText}>View all calculators on the wiki   ▸</Text>
                </TouchableOpacity>
              </View>
            )}

          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const srStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 8 },
  name: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.parchment },
  cat: { fontFamily: theme.fonts.display, fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
  arrow: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.gold },
});

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
  infoBox: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.borderGold, borderRadius: 4, padding: 12, marginBottom: 20 },
  infoText: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchmentDim, lineHeight: 30 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  diamond: { width: 6, height: 6, backgroundColor: theme.colors.gold, transform: [{ rotate: '45deg' }], flexShrink: 0 },
  sectionTitle: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight, letterSpacing: 2, textTransform: 'uppercase', includeFontPadding: false },
  searchInput: { borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 3, backgroundColor: theme.colors.background, paddingHorizontal: 14, paddingVertical: 12, fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchment, marginBottom: 8 },
  list: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, backgroundColor: theme.colors.panel, overflow: 'hidden' },
  allCalcsBtn: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, paddingVertical: 12, alignItems: 'center', marginTop: 4, backgroundColor: theme.colors.panel },
  allCalcsBtnText: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.parchmentDim },
});