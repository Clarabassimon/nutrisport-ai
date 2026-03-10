const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const dep = pkg.dependencies['expo-image-picker'];
if (!dep) {
  pkg.dependencies['expo-image-picker'] = '~16.1.4';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
  console.log('Added expo-image-picker ~16.1.4');
} else {
  console.log('Already present:', dep);
}
