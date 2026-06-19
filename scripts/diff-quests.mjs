import fs from 'fs';
import https from 'https';

const get = (url) => new Promise((res, rej) => {
  https.get(url, (r) => { let d = ''; r.on('data', (c) => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej);
});

const [varbits, varps] = await Promise.all([
  get('https://raw.githubusercontent.com/weirdgloop/wikisync-api/master/src/runelite/data/questVarbits.json'),
  get('https://raw.githubusercontent.com/weirdgloop/wikisync-api/master/src/runelite/data/questVarps.json'),
]);

const wikisync = [...new Set([...Object.keys(varbits), ...Object.keys(varps)].filter((k) => k !== '.'))].sort();

const src = fs.readFileSync('constants/quest-data.ts', 'utf8');
const app = [...new Set([...src.matchAll(/name: '((?:\\'|[^'])*)'/g)].map((m) => m[1].replace(/\\'/g, "'")))].sort();

const aliases = {
  'Fairytale I - Growing Pains': 'Fairy Tale I',
  'Fairytale II - Cure a Queen': 'Fairy Tale II',
  'Desert Treasure II - The Fallen Empire': 'Desert Treasure II',
};

function appHas(wsName) {
  if (app.includes(wsName)) return true;
  if (aliases[wsName] && app.includes(aliases[wsName])) return true;
  if (wsName.startsWith('Recipe for Disaster') && app.includes('Recipe for Disaster')) return true;
  return false;
}

function wsHas(appName) {
  if (wikisync.includes(appName)) return true;
  const wsAlias = Object.entries(aliases).find(([, v]) => v === appName)?.[0];
  if (wsAlias && wikisync.includes(wsAlias)) return true;
  return false;
}

const missing = wikisync.filter((q) => !appHas(q));
const extra = app.filter((q) => !wsHas(q));

console.log('App:', app.length, 'WikiSync:', wikisync.length);
console.log('\nMissing from app (' + missing.length + '):');
missing.forEach((q) => console.log(' ', q));
console.log('\nIn app but NOT WikiSync (' + extra.length + '):');
extra.forEach((q) => console.log(' ', q));
