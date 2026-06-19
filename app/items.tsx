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
import { fetchMapping, searchMapping, formatGP, itemIconUrl, ItemMapping } from '../constants/ge-api';

// Category definitions

const ITEM_CATEGORIES: Record<string, { label: string; keywords: string[] }[]> = {
  A: [
    { label: 'Amulets',       keywords: ['amulet'] },
    { label: 'Armour',        keywords: ['armour', 'armor', 'platebody', 'chainbody', 'platelegs', 'plateskirt'] },
    { label: 'Arrows',        keywords: ['arrow'] },
    { label: 'Axes',          keywords: ['axe', 'hatchet'] },
  ],
  B: [
    { label: 'Bars',          keywords: ['bar'] },
    { label: 'Bolts',         keywords: ['bolt'] },
    { label: 'Bones',         keywords: ['bones', 'bone'] },
    { label: 'Boots',         keywords: ['boots'] },
    { label: 'Bows',          keywords: ['bow'] },
  ],
  C: [
    { label: 'Capes',         keywords: ['cape', 'cloak'] },
    { label: 'Crossbows',     keywords: ['crossbow'] },
    { label: 'Crystals',      keywords: ['crystal'] },
  ],
  D: [
    { label: 'Daggers',       keywords: ['dagger'] },
    { label: 'Darts',         keywords: ['dart'] },
    { label: 'Dragon items',  keywords: ['dragon'] },
    { label: 'Dragonhide',    keywords: ['dragonhide', "d'hide"] },
  ],
  E: [
    { label: 'Elven items',   keywords: ['elven', 'crystal'] },
    { label: 'Equipment',     keywords: ['equipment'] },
  ],
  F: [
    { label: 'Food',          keywords: ['fish', 'shark', 'lobster', 'swordfish', 'tuna', 'salmon', 'trout', 'pie', 'cake', 'bread', 'meat', 'stew', 'curry', 'karambwan'] },
    { label: 'Fletching',     keywords: ['fletching'] },
  ],
  G: [
    { label: 'Gems',          keywords: ['sapphire', 'emerald', 'ruby', 'diamond', 'dragonstone', 'onyx', 'zenyte'] },
    { label: 'Gloves',        keywords: ['gloves', 'gauntlets', 'vambraces'] },
    { label: 'God items',     keywords: ['saradomin', 'zamorak', 'guthix', 'armadyl', 'bandos', 'ancient'] },
  ],
  H: [
    { label: 'Helmets',       keywords: ['helm', 'helmet', 'hat', 'coif', 'hood', 'mask', 'tiara', 'headband'] },
    { label: 'Herbs',         keywords: ['herb', 'grimy', 'clean'] },
  ],
  I: [
    { label: 'Ingots',        keywords: ['ingot'] },
  ],
  J: [
    { label: 'Javelins',      keywords: ['javelin'] },
    { label: 'Jewellery',     keywords: ['ring', 'amulet', 'necklace', 'bracelet'] },
  ],
  K: [
    { label: 'Knives',        keywords: ['knife', 'knives'] },
  ],
  L: [
    { label: 'Logs',          keywords: ['logs'] },
    { label: 'Longswords',    keywords: ['longsword'] },
  ],
  M: [
    { label: 'Maces',         keywords: ['mace'] },
    { label: 'Magic armour',  keywords: ['robe', 'wizard', 'mystic', 'ancestral'] },
    { label: 'Materials',     keywords: ['ore', 'coal', 'clay', 'essence'] },
  ],
  N: [
    { label: 'Necklaces',     keywords: ['necklace'] },
  ],
  O: [
    { label: 'Ores',          keywords: ['ore'] },
  ],
  P: [
    { label: 'Pickaxes',      keywords: ['pickaxe'] },
    { label: 'Platebodies',   keywords: ['platebody'] },
    { label: 'Potions',       keywords: ['potion'] },
    { label: 'Prayer items',  keywords: ['prayer'] },
  ],
  Q: [
    { label: 'Quest items',   keywords: ['quest'] },
  ],
  R: [
    { label: 'Ranged armour', keywords: ['leather', 'studded', 'ranger'] },
    { label: 'Rings',         keywords: ['ring'] },
    { label: 'Runes',         keywords: ['rune'] },
  ],
  S: [
    { label: 'Scimitars',     keywords: ['scimitar'] },
    { label: 'Seeds',         keywords: ['seed'] },
    { label: 'Shields',       keywords: ['shield', 'defender', 'kiteshield', 'sq shield'] },
    { label: 'Skilling tools', keywords: ['chisel', 'needle', 'hammer', 'tinderbox', 'knife'] },
    { label: 'Spades',        keywords: ['spade'] },
    { label: 'Staves',        keywords: ['staff', 'wand', 'orb'] },
    { label: 'Swords',        keywords: ['sword'] },
  ],
  T: [
    { label: 'Thrownaxes',    keywords: ['thrownaxe'] },
    { label: 'Tiaras',        keywords: ['tiara'] },
  ],
  U: [
    { label: 'Uncuts',        keywords: ['uncut'] },
  ],
  V: [
    { label: 'Vials',         keywords: ['vial'] },
  ],
  W: [
    { label: 'Whips',         keywords: ['whip'] },
    { label: 'Wilderness',    keywords: ['wilderness', 'revenant', 'corrupt'] },
  ],
  Z: [
    { label: 'Zenyte items',  keywords: ['zenyte'] },
  ],
};
const LETTERS = Object.keys(ITEM_CATEGORIES).sort();

// Background 

function StoneBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Image source={require('../assets/icons/osrs-bg-scale.png')} style={{ width, height }} resizeMode="cover" />
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject as any}>
        <Defs>
          <RadialGradient id="vigItems" cx="50%" cy="45%" r="70%">
            <Stop offset="0%"   stopColor="#0d0900" stopOpacity="0.0" />
            <Stop offset="75%"  stopColor="#0d0900" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0d0900" stopOpacity="0.92" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#vigItems)" />
      </Svg>
    </View>
  );
}

// Wiki API

const WIKI_API = 'https://oldschool.runescape.wiki/api.php';
const UA = 'AdventurersLog-App/1.0';

type WikiSection = { index: string; line: string; level: string };

const WANTED_SECTIONS = [
  'obtaining', 'creation', 'item sources', 'drop sources', 'dropping monsters',
  'products', 'store locations', 'usage', 'trivia', 'changes',
  'shop locations', 'spawns', 'quest item', 'history',
];

// Typed line system

type Line =
  | { kind: 'subhead';  text: string }
  | { kind: 'kv';       label: string; value: string }
  | { kind: 'kvnote';   text: string }          // full-width note inside a KV block
  | { kind: 'material'; name: string; qty: string; cost: string }
  | { kind: 'summary';  label: string; value: string }
  | { kind: 'bullet';   text: string }
  | { kind: 'text';     text: string }
  | { kind: 'tablerow';    cells: string[] }
  | { kind: 'tableheader'; cells: string[] };

// HTML helpers

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\(update\)/gi, '')
    .replace(/edit\s*\|\s*edit\s*source/gi, '')
    .replace(/\[\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extracts <th> and <td> cells from a single <tr> row,
// preserving which tag type each cell came from.
function extractCells(rowHtml: string): { tag: 'th' | 'td'; text: string }[] {
  const cells: { tag: 'th' | 'td'; text: string }[] = [];
  const cellRegex = /<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = cellRegex.exec(rowHtml)) !== null) {
    const text = stripTags(m[2]);
    if (text) cells.push({ tag: m[1].toLowerCase() as 'th' | 'td', text });
  }
  return cells;
}

function extractRows(tableHtml: string): {
  isHeaderOnly: boolean;   // true = all <th>, no <td> -> real column header row
  isMixedKV: boolean;      // true = alternating <th>label<td>value pairs
  cells: { tag: 'th' | 'td'; text: string }[];
}[] {
  const rows: { isHeaderOnly: boolean; isMixedKV: boolean; cells: { tag: 'th' | 'td'; text: string }[] }[] = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRegex.exec(tableHtml)) !== null) {
    const cells = extractCells(trMatch[1]);
    if (cells.length === 0) continue;
    const hasTh = cells.some(c => c.tag === 'th');
    const hasTd = cells.some(c => c.tag === 'td');
    const isHeaderOnly = hasTh && !hasTd;
    // Mixed KV: row has both <th> (labels) and <td> (values), alternating
    const isMixedKV = hasTh && hasTd;
    rows.push({ isHeaderOnly, isMixedKV, cells });
  }
  return rows;
}

// ── Main parser: HTML → Line[] ────────────────────────────────────────────────

function parseHtmlToLines(html: string): Line[] {
  const lines: Line[] = [];

  html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<span class="mw-editsection">[\s\S]*?<\/span>/g, '');
  html = html.replace(/<sup[\s\S]*?<\/sup>/g, '');

  const elementRegex = /(<table[\s\S]*?<\/table>)|(<h[2-4][^>]*>[\s\S]*?<\/h[2-4]>)|(<ul[\s\S]*?<\/ul>)|(<p[^>]*>[\s\S]*?<\/p>)/gi;
  let match: RegExpExecArray | null;

  while ((match = elementRegex.exec(html)) !== null) {
    const el = match[0];

    if (/<table/i.test(el)) {
      const rows = extractRows(el);
      if (rows.length === 0) continue;

      const headerOnlyRow = rows.find(r => r.isHeaderOnly);
      const headerCells = (headerOnlyRow?.cells ?? []).map(c => c.text.toLowerCase());
      const dataRows = rows.filter(r => !r.isHeaderOnly);

      // ── Materials table: "item" + "quantity" in header ────────────────────
      if (headerCells.some(c => c === 'item') && headerCells.some(c => c.includes('quantity'))) {
        for (const row of dataRows) {
          const cells = row.cells.map(c => c.text);
          if (cells.length === 0) continue;
          const name = cells[0] ?? '';
          const qty  = cells[1] ?? '';
          const cost = cells[2] ?? '';
          const isSummary = ['total', 'profit'].some(k => name.toLowerCase().startsWith(k));
          if (isSummary) {
            lines.push({ kind: 'summary', label: name, value: cost || qty });
          } else if (name) {
            lines.push({ kind: 'material', name, qty, cost });
          }
        }

      // ── KV table: has mixed <th>label<td>value rows (Requirements block) ──
      // We parse each row by pairing <th> labels with their following <td> values.
      // Full-width single-cell rows (like "Completion of Imp Catcher") become kvnote.
      } else if (rows.some(r => r.isMixedKV) && !headerOnlyRow) {
        for (const row of rows) {
          const cells = row.cells;
          if (cells.length === 1) {
            // Full-width note (e.g. "Completion of Imp Catcher")
            lines.push({ kind: 'kvnote', text: cells[0].text });
            continue;
          }
          // Pair up <th> labels with the <td> value that immediately follows
          let i = 0;
          while (i < cells.length) {
            if (cells[i].tag === 'th' && i + 1 < cells.length && cells[i + 1].tag === 'td') {
              lines.push({ kind: 'kv', label: cells[i].text, value: cells[i + 1].text });
              i += 2;
            } else {
              i++;
            }
          }
        }

      // ── Pure <th>-only table with no data rows: treat as KV ───────────────
      } else if (!headerOnlyRow) {
        for (const row of rows) {
          const cells = row.cells.map(c => c.text);
          for (let i = 0; i + 1 < cells.length; i += 2) {
            const label = cells[i]?.trim();
            const value = cells[i + 1]?.trim();
            if (label && value) lines.push({ kind: 'kv', label, value });
          }
          if (cells.length % 2 !== 0 && cells.length > 0) {
            const orphan = cells[cells.length - 1]?.trim();
            if (orphan) lines.push({ kind: 'kvnote', text: orphan });
          }
        }

      // ── Generic table: Changes, Item sources, Products, etc. ──────────────
      } else if (headerOnlyRow) {
        lines.push({ kind: 'tableheader', cells: headerOnlyRow.cells.map(c => c.text) });
        for (const row of dataRows) {
          const cells = row.cells.map(c => c.text);
          if (cells.length > 0) lines.push({ kind: 'tablerow', cells });
        }
      }

    } else if (/<h[2-4]/i.test(el)) {
      const text = stripTags(el);
      if (text) lines.push({ kind: 'subhead', text });

    } else if (/<ul/i.test(el)) {
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let li: RegExpExecArray | null;
      while ((li = liRegex.exec(el)) !== null) {
        const text = stripTags(li[1]);
        if (text) lines.push({ kind: 'bullet', text });
      }

    } else {
      const text = stripTags(el);
      if (text) lines.push({ kind: 'text', text });
    }
  }

  return lines;
}

async function fetchItemSections(title: string): Promise<WikiSection[]> {
  try {
    const url = `${WIKI_API}?action=parse&page=${title.replace(/ /g, '_')}&prop=sections&format=json&origin=*`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const data = await res.json();
    if (data.error || !data.parse) return [];
    return (data.parse.sections || [])
      .filter((s: any) => WANTED_SECTIONS.some(w => s.line.toLowerCase().includes(w)))
      .map((s: any) => ({
        index: s.index,
        line: stripTags(s.line.replace(/<[^>]+>/g, '')),
        level: s.level,
      }));
  } catch { return []; }
}

async function fetchItemSummary(title: string): Promise<string> {
  try {
    const url = `${WIKI_API}?action=parse&page=${title.replace(/ /g, '_')}&section=0&prop=text&format=json&origin=*&redirects=1`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const data = await res.json();
    if (data.error || !data.parse) return '';
    let html = data.parse.text['*'];
    html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<span class="mw-editsection">[\s\S]*?<\/span>/g, '');
    html = html.replace(/<sup[\s\S]*?<\/sup>/g, '');
    html = html.replace(/<table[\s\S]*?<\/table>/gi, '');
    const paragraphs: string[] = [];
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let m: RegExpExecArray | null;
    while ((m = pRegex.exec(html)) !== null) {
      const text = stripTags(m[1]);
      if (text && text.length > 30) paragraphs.push(text);
    }
    return paragraphs.join('\n\n');
  } catch { return ''; }
}

async function fetchSectionLines(title: string, sectionIndex: string): Promise<Line[]> {
  try {
    const url = `${WIKI_API}?action=parse&page=${title.replace(/ /g, '_')}&section=${sectionIndex}&prop=text&format=json&origin=*&redirects=1`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const data = await res.json();
    if (data.error || !data.parse) return [{ kind: 'text', text: 'Could not load section.' }];
    return parseHtmlToLines(data.parse.text['*']);
  } catch {
    return [{ kind: 'text', text: 'Error loading section.' }];
  }
}

// ─── Table rendering ──────────────────────────────────────────────────────────

const COL_WIDTH_FIRST = 140;
const COL_WIDTH_REST  = 110;

type TableGroup = { headers: string[]; rows: string[][] };

function FlexTable({ group }: { group: TableGroup }) {
  return (
    <View style={tableStyles.container}>
      <View style={tableStyles.flexHeaderRow}>
        {group.headers.map((h, ci) => (
          <Text key={ci} style={[tableStyles.flexHeaderCell, { flex: ci === 0 ? 1 : 2 }]}>
            {h.toUpperCase()}
          </Text>
        ))}
      </View>
      {group.rows.map((row, ri) => (
        <View key={ri} style={[tableStyles.flexDataRow, ri % 2 === 1 && tableStyles.dataRowAlt]}>
          {row.map((cell, ci) => (
            <Text key={ci} style={[tableStyles.flexDataCell, { flex: ci === 0 ? 1 : 2 }]} numberOfLines={5}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function ScrollTable({ group }: { group: TableGroup }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={true} style={tableStyles.outerScroll}>
      <View>
        <View style={tableStyles.scrollHeaderRow}>
          {group.headers.map((h, ci) => (
            <Text key={ci} style={[tableStyles.scrollHeaderCell, { width: ci === 0 ? COL_WIDTH_FIRST : COL_WIDTH_REST }]}>
              {h.toUpperCase()}
            </Text>
          ))}
        </View>
        {group.rows.map((row, ri) => (
          <View key={ri} style={[tableStyles.scrollDataRow, ri % 2 === 1 && tableStyles.dataRowAlt]}>
            {row.map((cell, ci) => (
              <Text key={ci} style={[tableStyles.scrollDataCell, { width: ci === 0 ? COL_WIDTH_FIRST : COL_WIDTH_REST }]} numberOfLines={3}>
                {cell}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function TableRenderer({ group }: { group: TableGroup }) {
  return group.headers.length <= 3 ? <FlexTable group={group} /> : <ScrollTable group={group} />;
}

const tableStyles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 2,
  },
  flexHeaderRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.panelLight,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGold,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  flexHeaderCell: {
    fontFamily: theme.fonts.display,
    fontSize: 11,
    color: theme.colors.gold,
    letterSpacing: 1,
    textAlign: 'left',
    paddingRight: 8,
  },
  flexDataRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  flexDataCell: {
    fontFamily: theme.fonts.display,
    fontSize: 13,
    color: theme.colors.parchmentDim,
    textAlign: 'left',
    lineHeight: 19,
    paddingRight: 8,
  },
  outerScroll: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 3,
    marginTop: 6,
    marginBottom: 2,
  },
  scrollHeaderRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.panelLight,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGold,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  scrollHeaderCell: {
    fontFamily: theme.fonts.display,
    fontSize: 11,
    color: theme.colors.gold,
    letterSpacing: 1,
    textAlign: 'left',
    paddingRight: 8,
  },
  scrollDataRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  scrollDataCell: {
    fontFamily: theme.fonts.display,
    fontSize: 13,
    color: theme.colors.parchmentDim,
    textAlign: 'left',
    lineHeight: 19,
    paddingRight: 8,
  },
  dataRowAlt: {
    backgroundColor: theme.colors.panel,
  },
});

// ─── Line Renderers ───────────────────────────────────────────────────────────

// Groups consecutive kv/kvnote lines into a block, and tableheader+tablerow
// into TableGroups. Everything else renders individually.
type GroupedItem =
  | { kind: 'kvblock'; lines: Line[] }
  | { kind: 'tablegroup'; group: TableGroup }
  | Line;

function groupLines(lines: Line[]): GroupedItem[] {
  const result: GroupedItem[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Group consecutive kv/kvnote lines into one styled block
    if (line.kind === 'kv' || line.kind === 'kvnote') {
      const block: Line[] = [];
      while (i < lines.length && (lines[i].kind === 'kv' || lines[i].kind === 'kvnote')) {
        block.push(lines[i]);
        i++;
      }
      result.push({ kind: 'kvblock', lines: block });
      continue;
    }

    // Group tableheader + following tablerows into one TableGroup
    if (line.kind === 'tableheader') {
      const group: TableGroup = { headers: line.cells, rows: [] };
      i++;
      while (i < lines.length && lines[i].kind === 'tablerow') {
        group.rows.push((lines[i] as { kind: 'tablerow'; cells: string[] }).cells);
        i++;
      }
      result.push({ kind: 'tablegroup', group });
      continue;
    }

    result.push(line);
    i++;
  }
  return result;
}

// Renders a KV block as a neat bordered requirements box
function KVBlock({ lines }: { lines: Line[] }) {
  return (
    <View style={kvBlockStyles.container}>
      {lines.map((line, i) => {
        if (line.kind === 'kvnote') {
          return (
            <View key={i} style={kvBlockStyles.noteRow}>
              <Text style={kvBlockStyles.noteText}>{line.text}</Text>
            </View>
          );
        }
        if (line.kind === 'kv') {
          return (
            <View key={i} style={[kvBlockStyles.row, i < lines.length - 1 && kvBlockStyles.rowBorder]}>
              <Text style={kvBlockStyles.label}>{line.label}</Text>
              <Text style={kvBlockStyles.value}>{line.value}</Text>
            </View>
          );
        }
        return null;
      })}
    </View>
  );
}

const kvBlockStyles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.panel,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  label: {
    fontFamily: theme.fonts.display,
    fontSize: 13,
    color: theme.colors.gold,
    letterSpacing: 0.5,
    flex: 1,
  },
  value: {
    fontFamily: theme.fonts.display,
    fontSize: 13,
    color: theme.colors.parchment,
    flex: 1,
    textAlign: 'right',
  },
  noteRow: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  noteText: {
    fontFamily: theme.fonts.display,
    fontSize: 13,
    color: theme.colors.parchmentDim,
    fontStyle: 'italic',
  },
});

function LineRenderer({ line, index, sectionTitle }: { line: Line; index: number; sectionTitle: string }) {
  switch (line.kind) {
    case 'subhead':
      if (line.text.toLowerCase() === sectionTitle.toLowerCase()) return null;
      return <Text key={index} style={lineStyles.subhead}>{line.text}</Text>;

    case 'material':
      return (
        <View key={index} style={[lineStyles.materialRow, index % 2 === 0 && lineStyles.materialRowAlt]}>
          <Text style={lineStyles.materialName} numberOfLines={1}>{line.name}</Text>
          <Text style={lineStyles.materialQty}>{line.qty}</Text>
          <Text style={lineStyles.materialCost}>{line.cost}</Text>
        </View>
      );

    case 'summary':
      return (
        <View key={index} style={lineStyles.summaryRow}>
          <Text style={lineStyles.summaryLabel}>{line.label}</Text>
          <Text style={lineStyles.summaryValue}>{line.value}</Text>
        </View>
      );

    case 'bullet':
      return (
        <View key={index} style={lineStyles.bulletRow}>
          <Text style={lineStyles.bulletDot}>•</Text>
          <Text style={lineStyles.bulletText}>{line.text}</Text>
        </View>
      );

    case 'text':
      return (
        <View key={index} style={lineStyles.textBlock}>
          <Text style={lineStyles.textContent}>{line.text}</Text>
        </View>
      );

    default:
      return null;
  }
}

function MaterialsHeader() {
  return (
    <View style={lineStyles.materialsHeader}>
      <Text style={[lineStyles.materialsHeaderCell, { flex: 2 }]}>ITEM</Text>
      <Text style={lineStyles.materialsHeaderCell}>QTY</Text>
      <Text style={lineStyles.materialsHeaderCell}>COST</Text>
    </View>
  );
}

const lineStyles = StyleSheet.create({
  subhead: {
    fontFamily: theme.fonts.display,
    fontSize: 13,
    color: theme.colors.gold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 4,
  },
  materialsHeader: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.panelLight,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGold,
    marginTop: 4,
  },
  materialsHeaderCell: {
    fontFamily: theme.fonts.display,
    fontSize: 11,
    color: theme.colors.gold,
    letterSpacing: 1,
    flex: 1,
    textAlign: 'left',
  },
  materialRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  materialRowAlt: {
    backgroundColor: theme.colors.panel,
  },
  materialName: {
    fontFamily: theme.fonts.display,
    fontSize: 15,
    color: theme.colors.parchment,
    flex: 2,
  },
  materialQty: {
    fontFamily: theme.fonts.display,
    fontSize: 15,
    color: theme.colors.parchmentDim,
    flex: 1,
    textAlign: 'left',
  },
  materialCost: {
    fontFamily: theme.fonts.display,
    fontSize: 15,
    color: theme.colors.parchmentDim,
    flex: 1,
    textAlign: 'left',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderGold,
    backgroundColor: theme.colors.panel,
  },
  summaryLabel: {
    fontFamily: theme.fonts.display,
    fontSize: 13,
    color: theme.colors.gold,
    fontStyle: 'italic',
    flex: 1,
  },
  summaryValue: {
    fontFamily: theme.fonts.display,
    fontSize: 13,
    color: theme.colors.parchmentDim,
    textAlign: 'left',
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  bulletDot: {
    fontFamily: theme.fonts.display,
    fontSize: 14,
    color: theme.colors.gold,
  },
  bulletText: {
    fontFamily: theme.fonts.display,
    fontSize: 14,
    color: theme.colors.parchmentDim,
    flex: 1,
    lineHeight: 20,
  },
  textBlock: {
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.goldDim,
    paddingLeft: 8,
    marginBottom: 6,
    marginTop: 2,
  },
  textContent: {
    fontFamily: theme.fonts.display,
    fontSize: 14,
    color: theme.colors.parchmentDim,
    lineHeight: 21,
  },
});

// ─── Summary Section ──────────────────────────────────────────────────────────

function SummarySection({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={secStyles.container}>
      <TouchableOpacity style={secStyles.header} onPress={() => setExpanded(v => !v)}>
        <Text style={secStyles.title}>Summary</Text>
        <Text style={secStyles.chevron}>{expanded ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={secStyles.body}>
          {text.split('\n\n').map((para, i) => (
            <View key={i} style={summaryStyles.para}>
              <Text style={summaryStyles.text}>{para}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  para: {
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.goldDim,
    paddingLeft: 8,
    marginBottom: 10,
  },
  text: {
    fontFamily: theme.fonts.display,
    fontSize: 18,
    color: theme.colors.parchmentDim,
    lineHeight: 25,
  },
});

// ─── Expandable Section ───────────────────────────────────────────────────────

type ExpandableSectionProps = {
  title: string;
  itemName: string;
  sectionIndex: string;
};

function ExpandableSection({ title, itemName, sectionIndex }: ExpandableSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!expanded && lines === null) {
      setLoading(true);
      const result = await fetchSectionLines(itemName, sectionIndex);
      setLines(result);
      setLoading(false);
    }
    setExpanded((v) => !v);
  };

  const hasMaterials = lines?.some(l => l.kind === 'material') ?? false;
  let materialsHeaderEmitted = false;
  const grouped = lines ? groupLines(lines) : [];

  return (
    <View style={secStyles.container}>
      <TouchableOpacity style={secStyles.header} onPress={handleToggle}>
        <Text style={secStyles.title}>{title}</Text>
        {loading
          ? <ActivityIndicator color={theme.colors.gold} size="small" />
          : <Text style={secStyles.chevron}>{expanded ? '▾' : '▸'}</Text>
        }
      </TouchableOpacity>

      {expanded && (
        <View style={secStyles.body}>
          {lines === null ? (
            <ActivityIndicator color={theme.colors.gold} size="small" />
          ) : (
            <View>
              {grouped.map((item, i) => {
                if (item.kind === 'kvblock') {
                  return <KVBlock key={`kv-${i}`} lines={item.lines} />;
                }
                if (item.kind === 'tablegroup') {
                  return <TableRenderer key={`tg-${i}`} group={item.group} />;
                }
                const line = item as Line;
                if (hasMaterials && line.kind === 'material' && !materialsHeaderEmitted) {
                  materialsHeaderEmitted = true;
                  return (
                    <View key={`mat-group-${i}`}>
                      <MaterialsHeader />
                      <LineRenderer line={line} index={i} sectionTitle={title} />
                    </View>
                  );
                }
                return <LineRenderer key={i} line={line} index={i} sectionTitle={title} />;
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const secStyles = StyleSheet.create({
  container: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 12, backgroundColor: theme.colors.panelLight },
  title: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchment, flex: 1 },
  chevron: { color: theme.colors.gold, fontSize: 20, marginLeft: 8 },
  body: { backgroundColor: theme.colors.background, padding: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
});

// ─── Item Detail Panel ────────────────────────────────────────────────────────

type ItemDetailProps = {
  item: ItemMapping;
  onViewGE: () => void;
};

function ItemDetailPanel({ item, onViewGE }: ItemDetailProps) {
  const [sections, setSections] = useState<WikiSection[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [loadingSections, setLoadingSections] = useState(true);

  useEffect(() => {
    setSections([]);
    setSummary('');
    setLoadingSections(true);
    Promise.all([
      fetchItemSections(item.name),
      fetchItemSummary(item.name),
    ]).then(([s, sum]) => {
      setSections(s);
      setSummary(sum);
      setLoadingSections(false);
    });
  }, [item.name]);

  const hasWikiContent = summary.length > 0 || sections.length > 0;

  return (
    <View style={detailStyles.container}>
      <View style={detailStyles.header}>
        {item.icon ? (
          <Image source={{ uri: itemIconUrl(item.icon) }} style={detailStyles.icon} resizeMode="contain" />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={detailStyles.name}>{item.name}</Text>
          <Text style={detailStyles.meta}>
            {item.members ? 'Members' : 'Free to play'}
            {item.limit ? ` · Buy limit: ${item.limit.toLocaleString()}` : ''}
          </Text>
        </View>
      </View>

      {item.examine ? (
        <Text style={detailStyles.examine}>"{item.examine}"</Text>
      ) : null}

      <View style={detailStyles.statsGrid}>
        {item.highalch ? (
          <View style={detailStyles.statTile}>
            <Text style={detailStyles.statLabel}>High Alch</Text>
            <Text style={detailStyles.statValue}>{formatGP(item.highalch)}</Text>
            <Text style={detailStyles.statUnit}>gp</Text>
          </View>
        ) : null}
        {item.lowalch ? (
          <View style={detailStyles.statTile}>
            <Text style={detailStyles.statLabel}>Low Alch</Text>
            <Text style={detailStyles.statValue}>{formatGP(item.lowalch)}</Text>
            <Text style={detailStyles.statUnit}>gp</Text>
          </View>
        ) : null}
        {item.value ? (
          <View style={detailStyles.statTile}>
            <Text style={detailStyles.statLabel}>Shop Value</Text>
            <Text style={detailStyles.statValue}>{formatGP(item.value)}</Text>
            <Text style={detailStyles.statUnit}>gp</Text>
          </View>
        ) : null}
      </View>

      {loadingSections ? (
        <View style={detailStyles.sectionsLoading}>
          <ActivityIndicator color={theme.colors.gold} size="small" />
          <Text style={detailStyles.sectionsLoadingText}>Loading wiki info…</Text>
        </View>
      ) : hasWikiContent ? (
        <View style={detailStyles.sectionsContainer}>
          <View style={detailStyles.sectionsDivider}>
            <View style={detailStyles.dividerLine} />
            <View style={detailStyles.diamond} />
            <Text style={detailStyles.sectionsLabel}>WIKI INFO</Text>
            <View style={detailStyles.diamond} />
            <View style={detailStyles.dividerLine} />
          </View>
          {summary.length > 0 && <SummarySection text={summary} />}
          {sections.map((s) => (
            <ExpandableSection
              key={s.index}
              title={s.line}
              itemName={item.name}
              sectionIndex={s.index}
            />
          ))}
        </View>
      ) : null}

      <TouchableOpacity style={detailStyles.geButton} onPress={onViewGE}>
        <Image source={require('../assets/icons/menu/ge-logo.png')} style={detailStyles.geIcon} resizeMode="contain" />
        <Text style={detailStyles.geButtonText}>View on Grand Exchange</Text>
      </TouchableOpacity>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  container: { backgroundColor: theme.colors.panel, borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 4, padding: 14, gap: 12, marginBottom: 16 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 44, height: 44 },
  name: { fontFamily: theme.fonts.display, fontSize: 25, color: theme.colors.parchment, letterSpacing: 0.3, includeFontPadding: false },
  meta: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.textMuted, marginTop: 3 },
  examine: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchmentDim, fontStyle: 'italic', lineHeight: 30 },
  statsGrid: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statTile: { flex: 1, minWidth: 80, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, padding: 10, alignItems: 'center', gap: 2 },
  statLabel: { fontFamily: theme.fonts.display, fontSize: 10, color: theme.colors.parchmentDark, letterSpacing: 1, textTransform: 'uppercase' },
  statValue: { fontFamily: theme.fonts.display, fontSize: 25, color: theme.colors.goldLight, includeFontPadding: false },
  statUnit: { fontFamily: theme.fonts.display, fontSize: 10, color: theme.colors.textMuted },
  sectionsLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  sectionsLoadingText: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.textMuted },
  sectionsContainer: { gap: 6, paddingTop: 10 },
  sectionsDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dividerLine: { marginBottom: 10, flex: 1, height: 1, backgroundColor: theme.colors.border },
  diamond: { marginBottom: 10, width: 5, height: 5, backgroundColor: theme.colors.gold, transform: [{ rotate: '45deg' }] },
  sectionsLabel: { marginBottom: 10, fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.goldDim, letterSpacing: 2 },
  geButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.gold, borderRadius: 6, paddingVertical: 12 },
  geIcon: { width: 20, height: 20 },
  geButtonText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.background, fontWeight: '900', letterSpacing: 0.5 },
});

// ─── Category Row ─────────────────────────────────────────────────────────────

type CategoryRowProps = {
  letter: string;
  expanded: boolean;
  onToggle: () => void;
  onSelectCategory: (keywords: string[]) => void;
};

function CategoryRow({ letter, expanded, onToggle, onSelectCategory }: CategoryRowProps) {
  const subcats = ITEM_CATEGORIES[letter] ?? [];
  return (
    <View>
      <TouchableOpacity style={catStyles.letterRow} onPress={onToggle}>
        <View style={catStyles.letterBadge}>
          <Text style={catStyles.letterText}>{letter}</Text>
        </View>
        <View style={catStyles.previewRow}>
          {subcats.slice(0, 3).map((s) => (
            <Text key={s.label} style={catStyles.previewLabel}>{s.label}</Text>
          ))}
          {subcats.length > 3 && <Text style={catStyles.previewMore}>+{subcats.length - 3}</Text>}
        </View>
        <Text style={catStyles.chevron}>{expanded ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={catStyles.subcatList}>
          {subcats.map((sub) => (
            <TouchableOpacity
              key={sub.label}
              style={catStyles.subcatItem}
              onPress={() => onSelectCategory(sub.keywords)}
            >
              <Text style={catStyles.subcatText}>{sub.label}</Text>
              <Text style={catStyles.subcatArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const catStyles = StyleSheet.create({
  letterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  letterBadge: { width: 30, height: 30, borderRadius: 3, backgroundColor: theme.colors.panelLight, borderWidth: 1, borderColor: theme.colors.borderGold, alignItems: 'center', justifyContent: 'center' },
  letterText: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight, fontWeight: 'bold' },
  previewRow: { flex: 1, flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  previewLabel: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.parchmentDim },
  previewMore: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.textMuted },
  chevron: { color: theme.colors.gold, fontSize: 20 },
  subcatList: { backgroundColor: theme.colors.panel, borderRadius: 3, marginBottom: 4, overflow: 'hidden' },
  subcatItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  subcatText: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.parchment },
  subcatArrow: { fontFamily: theme.fonts.display, fontSize: 22, color: theme.colors.gold },
});

// ─── Search Result Item ───────────────────────────────────────────────────────

type ResultItemProps = {
  item: ItemMapping;
  onPress: () => void;
};

function ResultItem({ item, onPress }: ResultItemProps) {
  return (
    <TouchableOpacity style={resultStyles.row} onPress={onPress}>
      {item.icon ? (
        <Image source={{ uri: itemIconUrl(item.icon) }} style={resultStyles.icon} resizeMode="contain" />
      ) : <View style={resultStyles.icon} />}
      <View style={{ flex: 1 }}>
        <Text style={resultStyles.name}>{item.name}</Text>
        <Text style={resultStyles.meta}>
          {item.members ? 'Members' : 'F2P'}
          {item.highalch ? ` · High alch: ${formatGP(item.highalch)}` : ''}
        </Text>
      </View>
      {item.limit ? <Text style={resultStyles.limit}>Limit: {item.limit.toLocaleString()}</Text> : null}
    </TouchableOpacity>
  );
}

const resultStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  icon: { width: 32, height: 32 },
  name: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.parchment },
  meta: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.textMuted, marginTop: 2 },
  limit: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchmentDark },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ItemsScreen() {
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [mapping, setMapping] = useState<ItemMapping[]>([]);
  const [mappingLoaded, setMappingLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ItemMapping[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemMapping | null>(null);
  const [expandedLetter, setExpandedLetter] = useState<string | null>(null);
  const [categoryResults, setCategoryResults] = useState<ItemMapping[]>([]);
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const searchTimer = useRef<any>(null);

  useEffect(() => {
    fetchMapping().then((m) => { setMapping(m); setMappingLoaded(true); });
  }, []);

  useEffect(() => {
    if (q && q.trim().length > 0 && mappingLoaded && mapping.length > 0) {
      const found = mapping.find(
        (m) => m.name.toLowerCase() === (q as string).toLowerCase()
      );
      if (found) handleSelectItem(found);
      else setSearchQuery(q as string);
    }
  }, [q, mappingLoaded]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(() => {
      setSearchResults(searchMapping(mapping, searchQuery));
      setSelectedItem(null);
      setCategoryResults([]);
      setCategoryLabel(null);
    }, 200);
  }, [searchQuery, mapping]);

  const handleSelectItem = useCallback((item: ItemMapping) => {
    setSelectedItem(item);
    setSearchQuery('');
    setSearchResults([]);
    setCategoryResults([]);
    setCategoryLabel(null);
    Keyboard.dismiss();
  }, []);

  const handleSelectCategory = useCallback((keywords: string[], label: string) => {
    const results = mapping
      .filter((m) => keywords.some((kw) => m.name.toLowerCase().includes(kw.toLowerCase())))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 60);
    setCategoryResults(results);
    setCategoryLabel(label);
    setSelectedItem(null);
    setSearchQuery('');
    setSearchResults([]);
  }, [mapping]);

  const handleViewGE = useCallback(() => {
    router.push({ pathname: '/grand-exchange', params: { search: selectedItem?.name ?? '' } } as any);
  }, [selectedItem, router]);

  const showCategories = !searchQuery && !selectedItem && !categoryLabel;
  const showResults = searchResults.length > 0;
  const showCategoryResults = categoryResults.length > 0 && !!categoryLabel;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StoneBackground />
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
              <Text style={styles.screenTitle}>Items</Text>
              <View style={styles.taglineRow}>
                <View style={styles.ornamentLine} />
                <Text style={styles.ornamentSymbol}>✦</Text>
                <Text style={styles.screenSubtitle}>Browse & Lookup</Text>
                <Text style={styles.ornamentSymbol}>✦</Text>
                <View style={styles.ornamentLine} />
              </View>
            </View>

            {/* Search */}
            <View style={styles.section}>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder={mappingLoaded ? 'Search any item…' : 'Loading items…'}
                  placeholderTextColor={theme.colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                  autoCapitalize="none"
                  editable={mappingLoaded}
                />
                {!mappingLoaded && <ActivityIndicator color={theme.colors.gold} style={{ marginLeft: 10 }} />}
              </View>
              {showResults && (
                <View style={styles.resultsList}>
                  {searchResults.map((item) => (
                    <ResultItem key={item.id} item={item} onPress={() => handleSelectItem(item)} />
                  ))}
                </View>
              )}
            </View>

            {/* Selected item detail */}
            {selectedItem && (
              <View style={styles.section}>
                <TouchableOpacity style={styles.backToCats} onPress={() => setSelectedItem(null)}>
                  <Text style={styles.backToCatsText}>← Back</Text>
                </TouchableOpacity>
                <View style={styles.skillsHeader}>
                  <View style={styles.ornamentLine} />
                  <View style={styles.diamond} />
                  <Text style={styles.sectionTitle}>Item Detail</Text>
                  <View style={styles.diamond} />
                  <View style={styles.ornamentLine} />
                </View>
                <ItemDetailPanel item={selectedItem} onViewGE={handleViewGE} />
              </View>
            )}

            {/* Category results */}
            {showCategoryResults && (
              <View style={styles.section}>
                <View style={styles.skillsHeader}>
                  <View style={styles.ornamentLine} />
                  <View style={styles.diamond} />
                  <Text style={styles.sectionTitle}>{categoryLabel}</Text>
                  <View style={styles.diamond} />
                  <View style={styles.ornamentLine} />
                </View>
                <TouchableOpacity style={styles.backToCats} onPress={() => { setCategoryResults([]); setCategoryLabel(null); }}>
                  <Text style={styles.backToCatsText}>← Back to categories</Text>
                </TouchableOpacity>
                <View style={styles.resultsList}>
                  {categoryResults.map((item) => (
                    <ResultItem key={item.id} item={item} onPress={() => handleSelectItem(item)} />
                  ))}
                </View>
              </View>
            )}

            {/* A–Z Category browser */}
            {showCategories && (
              <View style={styles.section}>
                <View style={styles.skillsHeader}>
                  <View style={styles.ornamentLine} />
                  <View style={styles.diamond} />
                  <Text style={styles.sectionTitle}>Browse by Category</Text>
                  <View style={styles.diamond} />
                  <View style={styles.ornamentLine} />
                </View>
                <View style={styles.categoryList}>
                  {LETTERS.map((letter) => (
                    <CategoryRow
                      key={letter}
                      letter={letter}
                      expanded={expandedLetter === letter}
                      onToggle={() => setExpandedLetter(expandedLetter === letter ? null : letter)}
                      onSelectCategory={(keywords) => {
                        const sub = ITEM_CATEGORIES[letter].find((s) => s.keywords === keywords);
                        handleSelectCategory(keywords, sub?.label ?? letter);
                      }}
                    />
                  ))}
                </View>
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
  section: { marginBottom: 20 },
  skillsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  diamond: { width: 6, height: 6, backgroundColor: theme.colors.gold, transform: [{ rotate: '45deg' }], flexShrink: 0 },
  sectionTitle: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight, letterSpacing: 2, textTransform: 'uppercase', includeFontPadding: false },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 3, backgroundColor: theme.colors.background, paddingHorizontal: 14, paddingVertical: 12, fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchment },
  resultsList: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, backgroundColor: theme.colors.panel, overflow: 'hidden' },
  categoryList: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, backgroundColor: theme.colors.panel, overflow: 'hidden', paddingHorizontal: 8 },
  backToCats: { marginBottom: 20 },
  backToCatsText: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.gold },
});