const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const icons = [
  ['adventurers-log',     'Worn_equipment_icon_(detail).png'],
  ['items',               'Items_icon.png'],
  ['equipment',           'Worn_equipment_icon_(detail).png'],
  ['bestiary',            'Multicombat.png'],
  ['locations',           'World_map_icon.png'],
  ['minigames',           'Minigame_map_icon.png'],
  ['achievement-diaries', 'Achievement_Diaries_icon.png'],
  ['quests',              'Quest_point_icon.png'],
  ['skills',              'Stats_icon.png'],
  ['skill-guides',        'Stats_icon.png'],
  ['new-player-guide',    'Tutorial_Island_icon.png'],
  ['money-making',        'Coins_10000.png'],
  ['calculators',         'Calculator_icon.png'],
];

const outDir = path.join(__dirname, 'assets', 'icons', 'menu');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function download(url, dest, redirects = 0) {
  if (redirects > 5) {
    console.error(`✗ Too many redirects for ${dest}`);
    return;
  }

  const client = url.startsWith('https') ? https : http;

  client.get(url, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
      const location = res.headers.location;
      const nextUrl = location.startsWith('http') ? location : `https://oldschool.runescape.wiki${location}`;
      download(nextUrl, dest, redirects + 1);
      return;
    }

    if (res.statusCode !== 200) {
      console.error(`✗ HTTP ${res.statusCode} for ${path.basename(dest)}`);
      return;
    }

    const contentType = res.headers['content-type'] || '';
    if (!contentType.includes('image')) {
      console.error(`✗ Not an image (${contentType}) for ${path.basename(dest)}`);
      return;
    }

    const file = fs.createWriteStream(dest);
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`✓ ${path.basename(dest)}`);
    });
  }).on('error', (err) => {
    console.error(`✗ ${path.basename(dest)}: ${err.message}`);
  });
}

icons.forEach(([saveName, wikiName]) => {
  const url = `https://oldschool.runescape.wiki/images/${wikiName}`;
  const dest = path.join(outDir, `${saveName}.png`);
  download(url, dest);
});