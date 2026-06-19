import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, ImageSourcePropType, useWindowDimensions,
} from 'react-native';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../constants/theme';

// Types

type SkillName =
  | 'Attack' | 'Defence' | 'Strength' | 'Hitpoints' | 'Ranged'
  | 'Prayer' | 'Magic' | 'Cooking' | 'Woodcutting' | 'Fletching'
  | 'Fishing' | 'Firemaking' | 'Crafting' | 'Smithing' | 'Mining'
  | 'Herblore' | 'Agility' | 'Thieving' | 'Slayer' | 'Farming'
  | 'Runecraft' | 'Hunter' | 'Construction' | 'Sailing';

type SkillInfo = {
  name: SkillName;
  type: 'Combat' | 'Gathering' | 'Artisan' | 'Support' | 'Members';
  members: boolean;
  description: string;
  milestones: { level: number; unlock: string }[];
  methods: { range: string; method: string; rate: string }[];
};

// Skill data

const SKILL_DATA: Record<SkillName, Omit<SkillInfo, 'name'>> = {
  Attack: {
    type: 'Combat', members: false,
    description: 'Attack determines your accuracy in melee combat. A higher Attack level lets you wield better melee weapons and increases your chance to hit.',
    milestones: [
      { level: 1,  unlock: 'Bronze through Iron weapons' },
      { level: 5,  unlock: 'Steel weapons' },
      { level: 20, unlock: 'Mithril weapons' },
      { level: 30, unlock: 'Adamant weapons' },
      { level: 40, unlock: 'Rune weapons' },
      { level: 60, unlock: 'Dragon weapons' },
      { level: 70, unlock: 'Abyssal whip, Barrows weapons' },
      { level: 75, unlock: 'Godswords' },
    ],
    methods: [
      { range: '1–30',  method: 'Cows / Chickens (Lumbridge)', rate: '~5k XP/hr' },
      { range: '30–60', method: 'Al Kharid Warriors / Hill Giants', rate: '~20k XP/hr' },
      { range: '60–99', method: 'Nightmare Zone / Slayer', rate: '~50–80k XP/hr' },
    ],
  },
  Strength: {
    type: 'Combat', members: false,
    description: 'Strength increases your maximum melee hit. A higher Strength level means you hit harder, making combat faster.',
    milestones: [
      { level: 1,  unlock: 'Basic melee' },
      { level: 40, unlock: 'Whip training benefit' },
      { level: 60, unlock: 'Barrows gloves requirement (via RFD)' },
      { level: 85, unlock: 'Toxic Blowpipe, Abyssal dagger' },
      { level: 99, unlock: 'Strength cape, max hit increases' },
    ],
    methods: [
      { range: '1–30',  method: 'Cows / Chickens', rate: '~5k XP/hr' },
      { range: '30–70', method: 'Aggressive style on Slayer tasks', rate: '~25k XP/hr' },
      { range: '70–99', method: 'Nightmare Zone (Aggressive)', rate: '~80–100k XP/hr' },
    ],
  },
  Defence: {
    type: 'Combat', members: false,
    description: 'Defence reduces the chance of enemies hitting you. Higher Defence lets you wear better armour.',
    milestones: [
      { level: 1,  unlock: 'Leather armour' },
      { level: 20, unlock: 'Mithril armour' },
      { level: 30, unlock: 'Adamant armour' },
      { level: 40, unlock: 'Rune armour' },
      { level: 70, unlock: 'Barrows armour, Dragon armour' },
      { level: 99, unlock: 'Defence cape' },
    ],
    methods: [
      { range: '1–40',  method: 'Train alongside Attack/Strength on Defensive style', rate: '~5–20k XP/hr' },
      { range: '40–99', method: 'Nightmare Zone (Defensive)', rate: '~50–70k XP/hr' },
    ],
  },
  Hitpoints: {
    type: 'Combat', members: false,
    description: 'Hitpoints is your life total. You gain Hitpoints XP automatically through combat (1/3 of your combat XP goes to HP). You start at level 10.',
    milestones: [
      { level: 10, unlock: 'Starting Hitpoints' },
      { level: 45, unlock: 'Rock Cake + Guthan\'s method (NMZ)' },
      { level: 99, unlock: 'Hitpoints cape, increased food healing' },
    ],
    methods: [
      { range: '10–99', method: 'Gained automatically through combat', rate: '1/3 of combat XP' },
    ],
  },
  Ranged: {
    type: 'Combat', members: false,
    description: 'Ranged lets you fight from a distance using bows, crossbows, and throwing weapons. It also determines which ranged armour you can wear.',
    milestones: [
      { level: 1,  unlock: 'Shortbow, Throwing knives' },
      { level: 20, unlock: 'Oak shortbow' },
      { level: 30, unlock: 'Willow shortbow' },
      { level: 40, unlock: 'Maple shortbow, Green dragonhide' },
      { level: 50, unlock: 'Magic shortbow, Rune crossbow' },
      { level: 61, unlock: 'Karils crossbow, Ranger boots' },
      { level: 70, unlock: 'Armadyl crossbow' },
      { level: 75, unlock: 'Twisted bow (requirement)' },
    ],
    methods: [
      { range: '1–40',  method: 'Caged ogres / Sand crabs', rate: '~20k XP/hr' },
      { range: '40–70', method: 'Cannon (members) / Ogres', rate: '~60k XP/hr' },
      { range: '70–99', method: 'Chinchompas at Skeletal monkeys (members)', rate: '~400k XP/hr' },
    ],
  },
  Prayer: {
    type: 'Combat', members: false,
    description: 'Prayer gives you passive buffs in combat. Protect prayers make you near-immune to certain attack styles. Prayer points are restored by burying bones.',
    milestones: [
      { level: 1,  unlock: 'Thick Skin (+5% Defence)' },
      { level: 13, unlock: 'Protect Item' },
      { level: 25, unlock: 'Superhuman Strength (+5% Strength)' },
      { level: 37, unlock: 'Protect from Magic' },
      { level: 40, unlock: 'Protect from Missiles' },
      { level: 43, unlock: 'Protect from Melee — game changer' },
      { level: 55, unlock: 'Smite' },
      { level: 70, unlock: 'Piety (+25% Attack, Strength, Defence)' },
      { level: 74, unlock: 'Rigour (members) — +23% Ranged' },
      { level: 77, unlock: 'Augury (members) — +25% Magic' },
    ],
    methods: [
      { range: '1–43',  method: 'Bury regular/big bones while training combat', rate: 'Slow but free' },
      { range: '43–99', method: 'Dragon bones at Gilded altar (members)', rate: '~300k XP/hr' },
    ],
  },
  Magic: {
    type: 'Combat', members: false,
    description: 'Magic lets you cast spells using runes. It\'s used in combat, for utility spells (teleports, alchemy), and for skilling.',
    milestones: [
      { level: 1,  unlock: 'Wind Strike, basic spells' },
      { level: 25, unlock: 'Teleport to Lumbridge / Camelot' },
      { level: 43, unlock: 'High Level Alchemy — major money maker' },
      { level: 55, unlock: 'Superheat Item (smelt without a furnace)' },
      { level: 66, unlock: 'Teleport to POH (members)' },
      { level: 94, unlock: 'Vengeance (members)' },
      { level: 99, unlock: 'Magic cape' },
    ],
    methods: [
      { range: '1–55',  method: 'Splashing (vs weak enemies) / Quests', rate: '~7k XP/hr (splash)' },
      { range: '55–99', method: 'High Alch (passively) / Barraging (members)', rate: '~78k–1M XP/hr' },
    ],
  },
  Mining: {
    type: 'Gathering', members: false,
    description: 'Mining lets you extract ores from rocks. These ores are used in Smithing or sold on the Grand Exchange.',
    milestones: [
      { level: 1,  unlock: 'Copper, Tin ore' },
      { level: 15, unlock: 'Iron ore' },
      { level: 30, unlock: 'Coal' },
      { level: 40, unlock: 'Gold ore' },
      { level: 55, unlock: 'Mithril ore' },
      { level: 60, unlock: 'Mining Guild (F2P)' },
      { level: 70, unlock: 'Adamantite ore' },
      { level: 85, unlock: 'Runite ore' },
    ],
    methods: [
      { range: '1–15',  method: 'Copper/Tin in Lumbridge mine', rate: '~10k XP/hr' },
      { range: '15–60', method: 'Iron ore (3-rock method)', rate: '~40–60k XP/hr' },
      { range: '60–99', method: 'Motherlode Mine (members) / Granite', rate: '~40–65k XP/hr' },
    ],
  },
  Woodcutting: {
    type: 'Gathering', members: false,
    description: 'Woodcutting lets you chop down trees for logs. Logs are used in Firemaking and Fletching, or sold on the GE.',
    milestones: [
      { level: 1,  unlock: 'Normal trees' },
      { level: 15, unlock: 'Oak trees' },
      { level: 30, unlock: 'Willow trees' },
      { level: 45, unlock: 'Maple trees (members)' },
      { level: 60, unlock: 'Yew trees — best F2P money maker' },
      { level: 75, unlock: 'Magic trees' },
      { level: 90, unlock: 'Redwood trees (members)' },
    ],
    methods: [
      { range: '1–15',  method: 'Normal trees (Lumbridge)', rate: '~7k XP/hr' },
      { range: '15–30', method: 'Oak trees (Draynor Village)', rate: '~20k XP/hr' },
      { range: '30–60', method: 'Willows (Draynor)', rate: '~45k XP/hr' },
      { range: '60–99', method: 'Yews (F2P) or Teaks/Redwoods (members)', rate: '~40–165k XP/hr' },
    ],
  },
  Fishing: {
    type: 'Gathering', members: false,
    description: 'Fishing lets you catch fish for Cooking or selling. Some fish are best in slot food for PvM.',
    milestones: [
      { level: 1,  unlock: 'Shrimps, Anchovies' },
      { level: 20, unlock: 'Trout (fly fishing)' },
      { level: 35, unlock: 'Salmon' },
      { level: 40, unlock: 'Lobster' },
      { level: 50, unlock: 'Swordfish' },
      { level: 62, unlock: 'Monkfish (members)' },
      { level: 76, unlock: 'Sharks' },
      { level: 82, unlock: 'Anglerfish (members)' },
    ],
    methods: [
      { range: '1–20',  method: 'Shrimps in Lumbridge Swamp', rate: '~7k XP/hr' },
      { range: '20–60', method: 'Fly fishing (Barbarian Village)', rate: '~30–50k XP/hr' },
      { range: '60–99', method: 'Barbarian fishing (members) or Anglerfish', rate: '~50–110k XP/hr' },
    ],
  },
  Cooking: {
    type: 'Artisan', members: false,
    description: 'Cooking turns raw food into edible food. Higher Cooking reduces the chance of burning food. It\'s one of the fastest and cheapest 99s.',
    milestones: [
      { level: 1,  unlock: 'Shrimps' },
      { level: 30, unlock: 'Tuna (stop burning at 64)' },
      { level: 40, unlock: 'Lobster (stop burning at 74)' },
      { level: 45, unlock: 'Swordfish (stop burning at 86)' },
      { level: 62, unlock: 'Monkfish (members)' },
      { level: 80, unlock: 'Stop burning lobsters/swordfish (Cooking gauntlets)' },
      { level: 99, unlock: 'Never burn food (most types)' },
    ],
    methods: [
      { range: '1–99',  method: 'Cook fish on a range in Rogues\' Den (fastest, no burn chance)', rate: '~130–180k XP/hr' },
      { range: '1–99',  method: 'Buy raw fish, cook and resell (can be near-free)', rate: '~100–150k XP/hr' },
    ],
  },
  Smithing: {
    type: 'Artisan', members: false,
    description: 'Smithing lets you smelt ores into bars and forge bars into metal items. It\'s closely linked to Mining.',
    milestones: [
      { level: 1,  unlock: 'Bronze bars and items' },
      { level: 15, unlock: 'Iron bars' },
      { level: 30, unlock: 'Steel bars' },
      { level: 40, unlock: 'Mithril bars' },
      { level: 50, unlock: 'Adamant bars' },
      { level: 60, unlock: 'Runite bars' },
      { level: 99, unlock: 'Smithing cape' },
    ],
    methods: [
      { range: '1–40',  method: 'Smelt bronze/iron, smith into items', rate: '~20k XP/hr' },
      { range: '40–99', method: 'Blast Furnace (members) — steel/mithril bars', rate: '~100–370k XP/hr' },
    ],
  },
  Firemaking: {
    type: 'Artisan', members: false,
    description: 'Firemaking lets you light fires using logs and a tinderbox. One of the fastest 99s in the game via Wintertodt.',
    milestones: [
      { level: 1,  unlock: 'Normal logs' },
      { level: 15, unlock: 'Oak logs' },
      { level: 30, unlock: 'Willow logs' },
      { level: 45, unlock: 'Maple logs (members)' },
      { level: 50, unlock: 'Wintertodt (members) — best XP + money' },
      { level: 60, unlock: 'Yew logs' },
      { level: 75, unlock: 'Magic logs' },
    ],
    methods: [
      { range: '1–50',  method: 'Burn logs in a line (buy from GE)', rate: '~30–60k XP/hr' },
      { range: '50–99', method: 'Wintertodt (members)', rate: '~200–300k XP/hr + loot' },
    ],
  },
  Crafting: {
    type: 'Artisan', members: false,
    description: 'Crafting lets you make jewellery, armour from leather and dragonhide, and many other useful items.',
    milestones: [
      { level: 1,  unlock: 'Leather gloves/boots' },
      { level: 5,  unlock: 'Gold rings' },
      { level: 20, unlock: 'Gold amulet' },
      { level: 43, unlock: 'Uncut sapphire crafting' },
      { level: 54, unlock: 'Green dragonhide body' },
      { level: 63, unlock: 'Cosmic rune crafting (via Crafting Guild)' },
      { level: 66, unlock: 'Blue dragonhide body' },
    ],
    methods: [
      { range: '1–20',  method: 'Leather items', rate: '~15k XP/hr' },
      { range: '20–63', method: 'Gold bracelets at furnace', rate: '~70k XP/hr' },
      { range: '63–99', method: 'Battlestaves (members) / Dragonhide', rate: '~200–350k XP/hr' },
    ],
  },
  Runecraft: {
    type: 'Artisan', members: false,
    description: 'Runecraft lets you craft your own runes from essence. Runes are used for Magic spells. It\'s one of the hardest skills to level.',
    milestones: [
      { level: 1,  unlock: 'Air, Mind, Body runes' },
      { level: 9,  unlock: 'Cosmic runes (2x at 27)' },
      { level: 27, unlock: 'Chaos runes' },
      { level: 44, unlock: 'Nature runes — very profitable' },
      { level: 91, unlock: 'Double nature runes — extremely profitable' },
      { level: 99, unlock: 'Runecraft cape' },
    ],
    methods: [
      { range: '1–44',  method: 'Craft Air/Mind runes', rate: '~5–8k XP/hr' },
      { range: '44–91', method: 'Nature runes via Abyss (members)', rate: '~25–35k XP/hr' },
      { range: '77–99', method: 'Ourania Altar or Bloods/Souls (members)', rate: '~40–70k XP/hr' },
    ],
  },
  Herblore: {
    type: 'Artisan', members: true,
    description: 'Herblore (Members only) lets you make potions from herbs and secondary ingredients. Potions are essential for bossing.',
    milestones: [
      { level: 1,  unlock: 'Attack potion' },
      { level: 3,  unlock: 'Antipoison' },
      { level: 26, unlock: 'Prayer potion' },
      { level: 38, unlock: 'Strength potion' },
      { level: 55, unlock: 'Antidote++' },
      { level: 65, unlock: 'Super restore' },
      { level: 69, unlock: 'Super defence' },
      { level: 81, unlock: 'Saradomin brew — key boss supply' },
    ],
    methods: [
      { range: '1–38',  method: 'Clean herbs + make attack/antipoison potions', rate: '~20k XP/hr' },
      { range: '38–99', method: 'Clean herbs → make potions in bulk (buy from GE)', rate: '~200–500k XP/hr' },
    ],
  },
  Agility: {
    type: 'Support', members: true,
    description: 'Agility (Members only) increases how fast your run energy regenerates, and unlocks shortcuts around the world. Essential for efficient travel.',
    milestones: [
      { level: 1,  unlock: 'Gnome Agility Course' },
      { level: 10, unlock: 'Draynor rooftop course' },
      { level: 20, unlock: 'Al Kharid rooftop course' },
      { level: 35, unlock: 'Falador rooftop course, Tirannwn shortcuts' },
      { level: 60, unlock: 'Seers\' Village rooftop course' },
      { level: 70, unlock: 'Canifis shortcut to GWD area' },
      { level: 80, unlock: 'Hallowed Sepulchre, Ardougne rooftop' },
    ],
    methods: [
      { range: '1–30',  method: 'Gnome/Draynor courses', rate: '~8–10k XP/hr' },
      { range: '30–60', method: 'Rooftop courses (Varrock/Canifis)', rate: '~15–30k XP/hr' },
      { range: '60–99', method: 'Seers → Rellekka → Ardougne rooftops', rate: '~40–60k XP/hr' },
    ],
  },
  Thieving: {
    type: 'Support', members: true,
    description: 'Thieving (Members only) lets you pick pockets and steal from stalls. Great money at high levels and surprisingly fun.',
    milestones: [
      { level: 1,  unlock: 'Men/Women pickpocket' },
      { level: 5,  unlock: 'Baker\'s stall' },
      { level: 15, unlock: 'Master Farmer pickpocket' },
      { level: 38, unlock: 'Guards' },
      { level: 45, unlock: 'Fruit stalls (Hosidius)' },
      { level: 55, unlock: 'Knights of Ardougne — good early money' },
      { level: 91, unlock: 'Master Farmers (herb seeds)' },
      { level: 99, unlock: 'Elves — 2M+ gp/hr' },
    ],
    methods: [
      { range: '1–45',  method: 'Fruit stalls in Hosidius', rate: '~30–50k XP/hr' },
      { range: '45–91', method: 'Knights of Ardougne', rate: '~60–80k XP/hr' },
      { range: '91–99', method: 'Elves in Prifddinas', rate: '~250k XP/hr + money' },
    ],
  },
  Slayer: {
    type: 'Combat', members: true,
    description: 'Slayer (Members only) assigns you creatures to kill for XP. One of the most popular and rewarding skills — unlocks powerful monsters and unique drops.',
    milestones: [
      { level: 1,  unlock: 'Turael tasks (basic monsters)' },
      { level: 55, unlock: 'Slayer helmet (black mask requirement)' },
      { level: 62, unlock: 'Cave Krakens' },
      { level: 75, unlock: 'Gargoyles' },
      { level: 85, unlock: 'Abyssal demons (Abyssal whip!)' },
      { level: 87, unlock: 'Cerberus' },
      { level: 93, unlock: 'Hydra' },
      { level: 95, unlock: 'Alchemical Hydra' },
    ],
    methods: [
      { range: '1–75',  method: 'Broad tasks from Vannaka/Chaeldar', rate: '~20–40k XP/hr + combat XP' },
      { range: '75–99', method: 'Duradel tasks with Slayer helmet', rate: '~50–100k XP/hr + drops' },
    ],
  },
  Farming: {
    type: 'Gathering', members: true,
    description: 'Farming (Members only) lets you grow herbs, trees, and crops. It\'s mostly done in short bursts (farm runs) while doing other activities.',
    milestones: [
      { level: 1,  unlock: 'Potato, Onion, Cabbage' },
      { level: 9,  unlock: 'Tomatoes' },
      { level: 32, unlock: 'Watermelons' },
      { level: 38, unlock: 'Ranarr weed (very profitable)' },
      { level: 44, unlock: 'Toadflax' },
      { level: 54, unlock: 'Snapdragon' },
      { level: 70, unlock: 'Torstol' },
      { level: 85, unlock: 'Dragonfruit tree (best farming XP)' },
    ],
    methods: [
      { range: '1–99', method: 'Herb runs every 80 mins (5–6 patches)', rate: '~10 mins/run, great money' },
      { range: '1–99', method: 'Tree/fruit tree runs (every 8 hrs)', rate: 'Best XP per hour overall' },
    ],
  },
  Fletching: {
    type: 'Artisan', members: true,
    description: 'Fletching (Members only) lets you make bows, arrows, and darts. One of the fastest skills to 99 and can be done completely AFK.',
    milestones: [
      { level: 1,  unlock: 'Arrow shafts, shortbows' },
      { level: 10, unlock: 'Oak shortbow' },
      { level: 20, unlock: 'Oak longbow' },
      { level: 35, unlock: 'Maple shortbow' },
      { level: 52, unlock: 'Maple longbow' },
      { level: 55, unlock: 'Adamant darts' },
      { level: 67, unlock: 'Rune darts (great money)' },
      { level: 81, unlock: 'Dragon darts' },
    ],
    methods: [
      { range: '1–55',  method: 'String bows (maple longbows)', rate: '~100k XP/hr' },
      { range: '55–99', method: 'Darts (adamant → dragon)', rate: '~900k–1.5M XP/hr' },
    ],
  },
  Hunter: {
    type: 'Gathering', members: true,
    description: 'Hunter (Members only) lets you catch creatures using traps. Chinchompas are one of the best money-making skills and crucial for Ranged training.',
    milestones: [
      { level: 1,  unlock: 'Bird snares (Crimson swifts)' },
      { level: 9,  unlock: 'Deadfall traps' },
      { level: 15, unlock: 'Copper longtails' },
      { level: 27, unlock: 'Sapphire glacialis' },
      { level: 53, unlock: 'Grey chinchompas' },
      { level: 63, unlock: 'Red chinchompas — excellent money' },
      { level: 80, unlock: 'Black chinchompas (Wilderness, dangerous)' },
    ],
    methods: [
      { range: '1–53',  method: 'Bird snares → box traps', rate: '~10–40k XP/hr' },
      { range: '53–99', method: 'Chinchompas (grey → red → black)', rate: '~60–140k XP/hr' },
    ],
  },
  Construction: {
    type: 'Artisan', members: true,
    description: 'Construction (Members only) lets you build and upgrade your Player Owned House (POH). A high-level POH has a Gilded altar, Ornate pool, and portal nexus — invaluable utilities.',
    milestones: [
      { level: 1,  unlock: 'Basic furniture, Crude wooden chair' },
      { level: 33, unlock: 'Oak larder — fast early XP' },
      { level: 47, unlock: 'Prayer altar' },
      { level: 55, unlock: 'Gilded altar (requires 75)' },
      { level: 65, unlock: 'Fairy ring in garden' },
      { level: 75, unlock: 'Gilded altar — best Prayer training method' },
      { level: 83, unlock: 'Ornate pool (restore all stats)' },
      { level: 91, unlock: 'Portal nexus (teleport anywhere)' },
    ],
    methods: [
      { range: '1–33',  method: 'Chairs and crude workbenches', rate: '~20k XP/hr' },
      { range: '33–83', method: 'Oak larders (buy oak planks from GE)', rate: '~400k XP/hr' },
      { range: '83–99', method: 'Mahogany tables (most expensive, fastest)', rate: '~900k XP/hr' },
    ],
  },
  Sailing: {
    type: 'Support', members: true,
    description: 'Sailing (Members only) is the newest skill in OSRS, allowing you to navigate the seas of Gielinor. Explore islands, trade goods, and discover new content.',
    milestones: [
      { level: 1,  unlock: 'Basic sailing, small vessels' },
      { level: 20, unlock: 'Medium vessels, further travel' },
      { level: 40, unlock: 'Large vessels, island exploration' },
      { level: 60, unlock: 'Advanced navigation techniques' },
      { level: 80, unlock: 'Deep sea content' },
      { level: 99, unlock: 'Sailing cape, master seafarer' },
    ],
    methods: [
      { range: '1–50',  method: 'Basic sailing routes and cargo delivery', rate: 'Varies by route' },
      { range: '50–99', method: 'Deep sea fishing and island exploration', rate: 'Varies' },
    ],
  },
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

type SkillSnapshot = Record<SkillName, { level: number; xp: number }>;
type Character = { id: string; username: string; lastSnapshot?: SkillSnapshot };

const TYPE_COLORS: Record<string, string> = {
  Combat:    theme.colors.redLight,
  Gathering: theme.colors.greenLight,
  Artisan:   '#c8a030',
  Support:   '#4a90d9',
  Members:   '#9b59b6',
};

// Background

function StoneBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Image source={require('../assets/icons/osrs-bg-scale.png')} style={{ width, height }} resizeMode="cover" />
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject as any}>
        <Defs>
          <RadialGradient id="vigSkills" cx="50%" cy="45%" r="70%">
            <Stop offset="0%"   stopColor="#0d0900" stopOpacity="0.0" />
            <Stop offset="75%"  stopColor="#0d0900" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0d0900" stopOpacity="0.92" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#vigSkills)" />
      </Svg>
    </View>
  );
}

// Skill Detail Panel

function SkillDetailPanel({ skill, myLevel }: { skill: SkillName; myLevel?: number }) {
  const data = SKILL_DATA[skill];
  const typeColor = TYPE_COLORS[data.members ? 'Members' : data.type];
  const [showMilestones, setShowMilestones] = useState(true);
  const [showMethods, setShowMethods] = useState(false);

  return (
    <View style={sdStyles.container}>
      {/* Header */}
      <View style={sdStyles.header}>
        <Image source={SKILL_ICONS[skill]} style={sdStyles.icon} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={sdStyles.name}>{skill}</Text>
          <View style={sdStyles.tagRow}>
            <View style={[sdStyles.tag, { borderColor: typeColor }]}>
              <Text style={[sdStyles.tagText, { color: typeColor }]}>
                {data.members ? 'Members Only' : data.type}
              </Text>
            </View>
            {myLevel !== undefined && (
              <View style={sdStyles.levelTag}>
                <Text style={sdStyles.levelTagText}>Your level: {myLevel}</Text>
              </View>
            )}
          </View>
        </View>
        {myLevel !== undefined && (
          <View style={sdStyles.levelBadge}>
            <Text style={[sdStyles.levelBadgeNum, myLevel >= 99 && sdStyles.levelBadgeMaxed]}>
              {myLevel}
            </Text>
          </View>
        )}
      </View>

      <Text style={sdStyles.description}>{data.description}</Text>

      {/* XP bar if level known */}
      {myLevel !== undefined && (
        <View style={sdStyles.xpBar}>
          <View style={[sdStyles.xpFill, { width: `${(myLevel / 99) * 100}%` as any }]} />
        </View>
      )}

      {/* Milestones */}
      <TouchableOpacity style={sdStyles.sectionHeader} onPress={() => setShowMilestones(v => !v)}>
        <Text style={sdStyles.sectionTitle}>Key Milestones</Text>
        <Text style={sdStyles.chevron}>{showMilestones ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {showMilestones && (
        <View style={sdStyles.milestones}>
          {data.milestones.map((m) => {
            const reached = myLevel !== undefined && myLevel >= m.level;
            return (
              <View key={m.level} style={[sdStyles.milestoneRow, reached && sdStyles.milestoneReached]}>
                <View style={[sdStyles.levelPill, reached && sdStyles.levelPillReached]}>
                  <Text style={[sdStyles.levelPillText, reached && sdStyles.levelPillTextReached]}>
                    {m.level}
                  </Text>
                </View>
                <Text style={[sdStyles.milestoneText, reached && sdStyles.milestoneTextReached]}>
                  {m.unlock}
                </Text>
                {reached && <Text style={sdStyles.checkmark}>✓</Text>}
              </View>
            );
          })}
        </View>
      )}

      {/* Training methods */}
      <TouchableOpacity style={sdStyles.sectionHeader} onPress={() => setShowMethods(v => !v)}>
        <Text style={sdStyles.sectionTitle}>Training Methods</Text>
        <Text style={sdStyles.chevron}>{showMethods ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {showMethods && (
        <View style={sdStyles.methods}>
          {data.methods.map((m, i) => (
            <View key={i} style={sdStyles.methodRow}>
              <View style={sdStyles.methodRange}>
                <Text style={sdStyles.methodRangeText}>{m.range}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sdStyles.methodName}>{m.method}</Text>
                <Text style={sdStyles.methodRate}>{m.rate}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const sdStyles = StyleSheet.create({
  container: { backgroundColor: theme.colors.panel, borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 4, padding: 14, gap: 10, marginTop: 10 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 44, height: 44 },
  name: { fontFamily: theme.fonts.display, fontSize: 22, color: theme.colors.parchment, includeFontPadding: false },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  tag: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: theme.colors.background },
  tagText: { fontFamily: theme.fonts.display, fontSize: 15, fontWeight: 'bold' },
  levelTag: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: theme.colors.panelLight },
  levelTagText: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.parchmentDim },
  levelBadge: { width: 48, height: 48, borderRadius: 4, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.borderGold, alignItems: 'center', justifyContent: 'center' },
  levelBadgeNum: { fontFamily: theme.fonts.display, fontSize: 24, color: theme.colors.goldLight, includeFontPadding: false },
  levelBadgeMaxed: { color: '#ffd700' },
  description: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.parchmentDim, lineHeight: 30 },
  xpBar: { height: 6, backgroundColor: theme.colors.background, borderRadius: 3, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  xpFill: { height: '100%', backgroundColor: theme.colors.gold, borderRadius: 3 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  sectionTitle: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.gold, letterSpacing: 1, textTransform: 'uppercase' },
  chevron: { color: theme.colors.gold, fontSize: 20 },
  milestones: { gap: 6 },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  milestoneReached: { opacity: 0.7 },
  levelPill: { width: 34, height: 34, borderRadius: 10, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  levelPillReached: { backgroundColor: theme.colors.green, borderColor: theme.colors.greenLight },
  levelPillText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchmentDark },
  levelPillTextReached: { color: theme.colors.white },
  milestoneText: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.parchment, flex: 1 },
  milestoneTextReached: { color: theme.colors.parchmentDark, textDecorationLine: 'line-through' },
  checkmark: { color: theme.colors.greenLight, fontSize: 14 },
  methods: { gap: 8 },
  methodRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: theme.colors.background, borderRadius: 3, padding: 10, borderWidth: 1, borderColor: theme.colors.border },
  methodRange: { backgroundColor: theme.colors.panelLight, borderRadius: 3, paddingHorizontal: 8, marginTop: 5, paddingVertical: 4, minWidth: 50, alignItems: 'center' },
  methodRangeText: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight },
  methodName: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchment, paddingTop: 5 },
  methodRate: { fontFamily: theme.fonts.display, fontSize: 17, paddingTop: 5, paddingBottom: 5, color: theme.colors.textMuted, marginTop: 2 },
});

// Skill Cell

function SkillCell({ skill, level, selected, onPress }:
  { skill: SkillName; level?: number; selected: boolean; onPress: () => void }) {
  const isMaxed = level !== undefined && level >= 99;
  const data = SKILL_DATA[skill];
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

export default function SkillsScreen() {
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillName | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('adventurers_log_characters').then((raw) => {
      if (raw) {
        try {
          const chars: Character[] = JSON.parse(raw);
          setCharacters(chars);
          if (chars.length > 0) setActiveCharId(chars[0].id);
        } catch {}
      }
    });
  }, []);

  const activeChar = characters.find(c => c.id === activeCharId) ?? null;

  const getLevel = useCallback((skill: SkillName): number | undefined => {
    return activeChar?.lastSnapshot?.[skill]?.level;
  }, [activeChar]);

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
          <Text style={styles.screenTitle}>Skills</Text>
          <View style={styles.taglineRow}>
            <View style={styles.ornamentLine} />
            <Text style={styles.ornamentSymbol}>✦</Text>
            <Text style={styles.screenSubtitle}>Training Guides & Milestones</Text>
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

        {characters.length === 0 && (
          <View style={styles.noCharBanner}>
            <Text style={styles.noCharText}>Add a character in the Adventurer's Log to see your levels here.</Text>
          </View>
        )}

        {/* Skill detail */}
        {selectedSkill && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.backToCats} onPress={() => setSelectedSkill(null)}>
              <Text style={styles.backToCatsText}>← Back to skills</Text>
            </TouchableOpacity>
            <View style={styles.sectionHeader}>
              <View style={styles.ornamentLine} />
              <View style={styles.diamond} />
              <Text style={styles.sectionTitle}>Skill Guide</Text>
              <View style={styles.diamond} />
              <View style={styles.ornamentLine} />
            </View>
            <SkillDetailPanel skill={selectedSkill} myLevel={getLevel(selectedSkill)} />
          </View>
        )}

        {/* Skills grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.ornamentLine} />
            <View style={styles.diamond} />
            <Text style={styles.sectionTitle}>All Skills</Text>
            <View style={styles.diamond} />
            <View style={styles.ornamentLine} />
          </View>
          <Text style={styles.gridHint}>Tap any skill for training guide & milestones</Text>
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

        {/* Type legend */}
        <View style={styles.legend}>
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <View key={type} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{type}</Text>
            </View>
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

  charRow: { marginBottom: 14, gap: 6 },
  charLabel: { fontFamily: theme.fonts.display, fontSize: 12, color: theme.colors.textMuted, letterSpacing: 1 },
  charChip: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 3, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: theme.colors.panel },
  charChipActive: { borderColor: theme.colors.borderGold, backgroundColor: theme.colors.panelLight },
  charChipText: { fontFamily: theme.fonts.display, fontSize: 13, color: theme.colors.parchmentDim },
  charChipTextActive: { color: theme.colors.goldLight },

  noCharBanner: { backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, padding: 14, marginBottom: 16 },
  noCharText: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.parchmentDim, lineHeight: 22 },

  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 0, marginTop: 5 },
  diamond: { width: 6, height: 6, backgroundColor: theme.colors.gold, transform: [{ rotate: '45deg' }], flexShrink: 0 },
  sectionTitle: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight, letterSpacing: 2, textTransform: 'uppercase', includeFontPadding: false },

  gridHint: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.textMuted, marginBottom: 20, textAlign: 'center', letterSpacing: 0.5 },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  skillCell: { width: '30%', backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center', gap: 4 },
  skillCellSelected: { borderColor: theme.colors.borderGold, backgroundColor: theme.colors.panelLight },
  skillCellMaxed: { borderColor: '#ffd700' },
  skillIcon: { width: 30, height: 30 },
  skillLevel: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.parchment, includeFontPadding: false },
  skillLevelMaxed: { color: '#ffd700' },
  skillName: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.parchmentDark, textAlign: 'center', includeFontPadding: false },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 4 },
  legendText: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.parchmentDark },

  backToCats: { marginBottom: 10 },
  backToCatsText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.gold },
});
