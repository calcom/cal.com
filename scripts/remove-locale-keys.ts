const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const localesDir = path.join(repoRoot, 'apps', 'web', 'public', 'static', 'locales');

const keysToRemove = [
  // Add keys to remove
];

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) files.push(...walkDir(full));
    else files.push(full);
  }
  return files;
}

function main() {
  if (!fs.existsSync(localesDir)) {
    console.error('Locales directory not found:', localesDir);
    process.exit(1);
  }

  const allFiles = walkDir(localesDir).filter(f => f.endsWith('.json'));
  const changed = [];

  for (const file of allFiles) {
    try {
      const raw = fs.readFileSync(file, 'utf8');

      let content = raw;
      for (const k of keysToRemove) {
        // regex explanation:
        // - match a property name: "key"\s*:\s*
        // - then match a value which can be a string "..." or object {...} or array [...] or primitive until comma/newline
        // - allow multiline values by [\s\S]*? non-greedy
        const propRegex = new RegExp('\\n\\s*"' + k + '"\\s*:\\s*(?:"[\\s\\S]*?"|\\{[\\s\\S]*?\\}|\\[[\\s\\S]*?\\]|[^,\\n}]+)\\s*,?', 'g');
        content = content.replace(propRegex, '\n');
      }

      // Remove any leftover trailing commas before closing brace
      content = content.replace(/,\s*([}\]])/g, '$1');

      // Validate resulting JSON
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (err) {
        // If validation fails, skip modification for this file to avoid corrupting translations
        // (do not overwrite original), and report the file
        console.error('Resulting JSON invalid after removals for', file, '-', err.message);
        continue;
      }

      // Compare to original parsed (if the original was valid) to decide whether changes occurred
      const originalParsed = (() => {
        try { return JSON.parse(raw); } catch (e) { return null; }
      })();

      // If the keys were removed, parsed will differ from originalParsed or originalParsed is null but content changed
      const changedAny = originalParsed ? (JSON.stringify(parsed) !== JSON.stringify(originalParsed)) : (content !== raw);

      if (changedAny) {
        // overwrite file without removed keys
        fs.writeFileSync(file, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
        changed.push(file);
      }
    } catch (err) {
      console.error('Error processing', file, err);
    }
  }

  console.log('\nSummary:');
  console.log('Files scanned:', allFiles.length);
  console.log('Files changed:', changed.length);
  if (changed.length) console.log(changed.join('\n'));
}

main();
