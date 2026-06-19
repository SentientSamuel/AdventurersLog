import fs from 'fs';

let c = fs.readFileSync('constants/quest-data.ts', 'utf8');
c = c.replace(/series: 'Quests\/Series#([^']+)'/g, (_, n) => `series: '${n.replace(/_/g, ' ')}'`);
fs.writeFileSync('constants/quest-data.ts', c);
console.log('Fixed series labels');
