const fs = require('fs');
const path = require('path');
const glob = require('glob');

const OLD = `<Text style={mdStyles.infoLabel}>📍 Location</Text>`;
const NEW = `<Image source={require('../../assets/icons/compass.png')} style={mdStyles.compassIcon} />
        <Text style={mdStyles.infoLabel}>Location</Text>`;

const files = glob.sync('src/**/*.{tsx,jsx}', { cwd: 'C:/Users/Dan/AdventurersLog' });

files.forEach(file => {
  const fullPath = path.join('C:/Users/Dan/AdventurersLog', file);
  const content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(OLD)) {
    console.log('Patching:', file);
    fs.writeFileSync(fullPath, content.replaceAll(OLD, NEW));
  }
});

console.log('Done!');