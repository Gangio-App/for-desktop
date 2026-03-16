#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const version = process.argv[2];
if (!version) {
  console.error('Please provide a version (e.g. 1.0.2)');
  process.exit(1);
}

const packagePath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.version = version;
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`Updated package.json to ${version}`);

try {
  execSync('git add package.json', { stdio: 'inherit' });
  execSync(`git commit -m "chore: release ${version}"`, { stdio: 'inherit' });
  execSync(`git tag v${version}`, { stdio: 'inherit' });
  console.log(`Tagged v${version}. Push with: git push && git push --tags`);
} catch (err) {
  console.error('Git operations failed. Make sure you have a clean working directory.');
}
