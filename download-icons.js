const https = require('https');
const fs = require('fs');
const path = require('path');

const skills = [
  'Attack', 'Defence', 'Strength', 'Hitpoints', 'Ranged', 'Prayer', 'Magic',
  'Cooking', 'Woodcutting', 'Fletching', 'Fishing', 'Firemaking', 'Crafting',
  'Smithing', 'Mining', 'Herblore', 'Agility', 'Thieving', 'Slayer', 'Farming',
  'Runecraft', 'Hunter', 'Construction', 'Sailing',
];

const outDir = path.join(__dirname, 'assets', 'icons', 'skills');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

skills.forEach((skill) => {
  const url = `https://oldschool.runescape.wiki/images/${skill}_icon.png`;
  const dest = path.join(outDir, `${skill}.png`);
  const file = fs.createWriteStream(dest);
  https.get(url, (res) => {
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`✓ ${skill}`);
    });
  }).on('error', (err) => {
    console.error(`✗ ${skill}: ${err.message}`);
  });
});