/**
 * Generates constants/quest-data.ts from WikiSync quest names + OSRS Wiki infoboxes.
 * Run: node scripts/generate-quest-data.mjs
 */
import fs from 'fs';
import https from 'https';

const UA = 'AdventurersLog-App/1.0';
const WIKI = 'https://oldschool.runescape.wiki/api.php';

const getJson = (url) => new Promise((res, rej) => {
  https.get(url, { headers: { 'User-Agent': UA } }, (r) => {
    let d = '';
    r.on('data', (c) => d += c);
    r.on('end', () => {
      try { res(JSON.parse(d)); } catch (e) { rej(e); }
    });
  }).on('error', rej);
});

const fetch = (params) => getJson(`${WIKI}?${params}&format=json&origin=*`);

async function loadWikiSyncNames() {
  const [b, p] = await Promise.all([
    getJson('https://raw.githubusercontent.com/weirdgloop/wikisync-api/master/src/runelite/data/questVarbits.json'),
    getJson('https://raw.githubusercontent.com/weirdgloop/wikisync-api/master/src/runelite/data/questVarps.json'),
  ]);
  return [...new Set([...Object.keys(b), ...Object.keys(p)].filter((k) => k !== '.'))].sort();
}

function parseField(wikitext, key) {
  const re = new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n|]+)`, 'i');
  const m = wikitext.match(re);
  return m ? m[1].trim() : null;
}

function parseDifficulty(wikitext) {
  const m = wikitext.match(/\{\{Quest details[^}]*\|[^}]*difficulty\s*=\s*([^|}\n]+)/i)
    ?? wikitext.match(/\|difficulty\s*=\s*([^|\n]+)/i);
  if (!m) return 'Intermediate';
  const d = m[1].trim();
  if (['Novice', 'Intermediate', 'Experienced', 'Master', 'Grandmaster', 'Special'].includes(d)) return d;
  return 'Intermediate';
}

function parseMembers(wikitext) {
  const v = parseField(wikitext, 'members');
  if (!v) return true;
  return !/^no$/i.test(v.replace(/\[\[|\]\]/g, ''));
}

function parseQp(wikitext) {
  const rewards = wikitext.match(/\{\{Quest rewards[\s\S]*?\}\}/i)?.[0] ?? wikitext;
  const qp = parseField(rewards, 'qp') ?? parseField(wikitext, 'qp') ?? parseField(wikitext, 'questpoints');
  const n = parseInt(qp ?? '1', 10);
  return Number.isFinite(n) ? n : 1;
}

const WIKI_TITLE_ALIASES = {
  "Recipe for Disaster - Another Cook's Quest": "Recipe for Disaster/Another Cook's Quest",
  "Recipe for Disaster - Culinaromancer": "Recipe for Disaster/Defeating the Culinaromancer",
  "Recipe for Disaster - Evil Dave": "Recipe for Disaster/Freeing Evil Dave",
  "Recipe for Disaster - King Awowogei": "Recipe for Disaster/Freeing King Awowogei",
  "Recipe for Disaster - Lumbridge Guide": "Recipe for Disaster/Freeing the Lumbridge Guide",
  "Recipe for Disaster - Mountain Dwarf": "Recipe for Disaster/Freeing the Mountain Dwarf",
  "Recipe for Disaster - Pirate Pete": "Recipe for Disaster/Freeing Pirate Pete",
  "Recipe for Disaster - Sir Amik Varze": "Recipe for Disaster/Freeing Sir Amik Varze",
  "Recipe for Disaster - Skrach Uglogwee": "Recipe for Disaster/Freeing Skrach Uglogwee",
  "Recipe for Disaster - Wartface & Bentnoze": "Recipe for Disaster/Freeing the Goblin generals",
};

function parseSeries(wikitext) {
  const m = wikitext.match(/\|\s*series\s*=\s*(\[\[[^\n]+\]\]|[^\n|]+)/i);
  if (!m) return null;
  const s = m[1].trim();
  if (!s || /^none$/i.test(s)) return null;
  const pipeMatch = s.match(/\[\[[^\]|]+\|([^\]]+)\]\]/);
  if (pipeMatch) return pipeMatch[1].replace(/'/g, "\\'");
  const plainMatch = s.match(/\[\[([^\]|]+)\]\]/);
  if (plainMatch) {
    const inner = plainMatch[1];
    if (inner.includes('#')) return inner.split('#').pop().replace(/_/g, ' ').replace(/'/g, "\\'");
    return inner.replace(/'/g, "\\'");
  }
  return s.replace(/'/g, "\\'");
}

function esc(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function fetchQuestMeta(name) {
  const pageTitle = WIKI_TITLE_ALIASES[name] ?? name;
  const title = encodeURIComponent(pageTitle.replace(/ /g, '_'));
  const data = await fetch(`action=parse&prop=wikitext&page=${title}`);
  const wikitext = data?.parse?.wikitext?.['*'] ?? '';
  if (!wikitext || wikitext.startsWith('#REDIRECT')) {
    return { name, qp: 1, members: true, difficulty: 'Intermediate', series: null, warn: 'no page' };
  }
  return {
    name,
    qp: parseQp(wikitext),
    members: parseMembers(wikitext),
    difficulty: parseDifficulty(wikitext),
    series: parseSeries(wikitext),
  };
}

async function main() {
  const names = await loadWikiSyncNames();
  console.log(`Fetching metadata for ${names.length} quests...`);

  const quests = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    process.stdout.write(`\r${i + 1}/${names.length}: ${name.slice(0, 40).padEnd(40)}`);
    try {
      quests.push(await fetchQuestMeta(name));
    } catch {
      quests.push({ name, qp: 1, members: true, difficulty: 'Intermediate', series: null, warn: 'fetch error' });
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  console.log('\n');

  const warnings = quests.filter((q) => q.warn);
  if (warnings.length) {
    console.log('Warnings:', warnings.map((q) => `${q.name} (${q.warn})`).join(', '));
  }

  const f2p = quests.filter((q) => !q.members);
  const members = quests.filter((q) => q.members);

  const lines = [];
  lines.push(`export type Difficulty = 'Novice' | 'Intermediate' | 'Experienced' | 'Master' | 'Grandmaster' | 'Special';`);
  lines.push('');
  lines.push('export type Quest = {');
  lines.push('  name: string;');
  lines.push('  qp: number;');
  lines.push('  members: boolean;');
  lines.push('  difficulty: Difficulty;');
  lines.push('  series?: string;');
  lines.push('};');
  lines.push('');
  lines.push('/** Canonical OSRS quest list — names match WikiSync for accurate sync. */');
  lines.push('export const QUESTS: Quest[] = [');

  const emit = (q) => {
    const series = q.series ? `, series: '${q.series}'` : '';
    lines.push(`  { name: '${esc(q.name)}', qp: ${q.qp}, members: ${q.members}, difficulty: '${q.difficulty}'${series} },`);
  };

  lines.push('  // Free-to-play');
  f2p.forEach(emit);
  lines.push('  // Members');
  members.forEach(emit);
  lines.push('];');
  lines.push('');
  lines.push('export const QUEST_NAME_LIST = QUESTS.map((q) => q.name);');

  fs.writeFileSync('constants/quest-data.ts', lines.join('\n') + '\n');
  console.log(`Wrote constants/quest-data.ts (${quests.length} quests, ${f2p.length} F2P, ${members.length} members)`);
}

main().catch(console.error);
