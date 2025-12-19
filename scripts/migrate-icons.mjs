#!/usr/bin/env node

/**
 * Migration script to convert <Icon name="icon-name" /> to direct lucide-react imports
 * 
 * Usage: node scripts/migrate-icons.mjs
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Convert kebab-case to PascalCase
function kebabToPascal(str) {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

// Find all files that use Icon component
function findIconFiles() {
  const result = execSync(
    'grep -rl "<Icon " --include="*.tsx" --include="*.ts" apps/ packages/',
    { encoding: 'utf-8', cwd: '/home/ubuntu/repos/cal.com' }
  ).trim();
  return result.split('\n').filter(Boolean);
}

// Extract all static icon names from a file
function extractStaticIconNames(content) {
  const iconNames = new Set();
  // Match <Icon name="icon-name" or name='icon-name'
  const regex = /<Icon[^>]*\sname=["']([a-z0-9-]+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    iconNames.add(match[1]);
  }
  return iconNames;
}

// Check if file has dynamic Icon name usage
function hasDynamicIconName(content) {
  // Match name={...} where ... is not a string literal
  const dynamicRegex = /<Icon[^>]*\sname=\{(?!["'])/;
  return dynamicRegex.test(content);
}

// Transform a single file
function transformFile(filePath) {
  const fullPath = path.join('/home/ubuntu/repos/cal.com', filePath);
  let content = fs.readFileSync(fullPath, 'utf-8');
  
  // Skip files with dynamic icon names - they need manual review
  if (hasDynamicIconName(content)) {
    console.log(`SKIP (dynamic): ${filePath}`);
    return { skipped: true, reason: 'dynamic' };
  }
  
  const iconNames = extractStaticIconNames(content);
  if (iconNames.size === 0) {
    console.log(`SKIP (no static icons): ${filePath}`);
    return { skipped: true, reason: 'no-icons' };
  }
  
  // Generate lucide-react imports
  const lucideImports = Array.from(iconNames).map(name => kebabToPascal(name));
  
  // Check if file already imports from lucide-react
  const hasLucideImport = /from ["']lucide-react["']/.test(content);
  
  // Transform Icon usages to direct component usage
  for (const iconName of iconNames) {
    const pascalName = kebabToPascal(iconName);
    
    // Replace <Icon name="icon-name" ... /> with <PascalName ... />
    // This regex captures everything between <Icon and /> except the name prop
    const pattern = new RegExp(
      `<Icon\\s+([^>]*?)\\s*name=["']${iconName}["']\\s*([^>]*?)\\s*/>`,
      'g'
    );
    
    content = content.replace(pattern, (match, before, after) => {
      // Clean up the before and after parts
      const beforeClean = before.trim();
      const afterClean = after.trim();
      const props = [beforeClean, afterClean].filter(Boolean).join(' ');
      if (props) {
        return `<${pascalName} ${props} />`;
      }
      return `<${pascalName} />`;
    });
    
    // Also handle case where name is the only prop or first prop
    const patternNameFirst = new RegExp(
      `<Icon\\s+name=["']${iconName}["']\\s*([^>]*?)\\s*/>`,
      'g'
    );
    
    content = content.replace(patternNameFirst, (match, rest) => {
      const restClean = rest.trim();
      if (restClean) {
        return `<${pascalName} ${restClean} />`;
      }
      return `<${pascalName} />`;
    });
  }
  
  // Remove Icon import from @calcom/ui
  // Handle various import patterns
  const importPatterns = [
    // import { Icon } from "@calcom/ui/components/icon"
    /import\s*\{\s*Icon\s*\}\s*from\s*["']@calcom\/ui\/components\/icon["'];?\n?/g,
    // import { Icon, IconName } from "@calcom/ui/components/icon"
    /import\s*\{\s*Icon,\s*IconName\s*\}\s*from\s*["']@calcom\/ui\/components\/icon["'];?\n?/g,
    /import\s*\{\s*IconName,\s*Icon\s*\}\s*from\s*["']@calcom\/ui\/components\/icon["'];?\n?/g,
    // import type { IconName } from "@calcom/ui/components/icon"
    /import\s+type\s*\{\s*IconName\s*\}\s*from\s*["']@calcom\/ui\/components\/icon["'];?\n?/g,
  ];
  
  for (const pattern of importPatterns) {
    content = content.replace(pattern, '');
  }
  
  // Handle Icon in @calcom/ui imports - need to remove Icon from the import list
  // import { Button, Icon, Dialog } from "@calcom/ui"
  content = content.replace(
    /import\s*\{([^}]*)\bIcon\b([^}]*)\}\s*from\s*["']@calcom\/ui["']/g,
    (match, before, after) => {
      const remaining = (before + after)
        .split(',')
        .map(s => s.trim())
        .filter(s => s && s !== 'Icon' && s !== 'IconName')
        .join(', ');
      if (remaining) {
        return `import { ${remaining} } from "@calcom/ui"`;
      }
      return ''; // Remove entire import if nothing left
    }
  );
  
  // Also handle type imports
  content = content.replace(
    /import\s+type\s*\{([^}]*)\bIconName\b([^}]*)\}\s*from\s*["']@calcom\/ui["']/g,
    (match, before, after) => {
      const remaining = (before + after)
        .split(',')
        .map(s => s.trim())
        .filter(s => s && s !== 'IconName')
        .join(', ');
      if (remaining) {
        return `import type { ${remaining} } from "@calcom/ui"`;
      }
      return '';
    }
  );
  
  // Add lucide-react import if not already present
  if (!hasLucideImport) {
    // Find the first import statement and add lucide-react import after it
    const importMatch = content.match(/^(import\s+.*?;?\n)/m);
    if (importMatch) {
      const lucideImportLine = `import { ${lucideImports.join(', ')} } from "lucide-react";\n`;
      content = content.replace(importMatch[0], importMatch[0] + lucideImportLine);
    }
  } else {
    // Merge with existing lucide-react import
    content = content.replace(
      /import\s*\{([^}]*)\}\s*from\s*["']lucide-react["']/,
      (match, existing) => {
        const existingImports = existing.split(',').map(s => s.trim()).filter(Boolean);
        const allImports = [...new Set([...existingImports, ...lucideImports])].sort();
        return `import { ${allImports.join(', ')} } from "lucide-react"`;
      }
    );
  }
  
  // Clean up any double newlines from removed imports
  content = content.replace(/\n{3,}/g, '\n\n');
  
  fs.writeFileSync(fullPath, content);
  console.log(`MIGRATED: ${filePath} (${iconNames.size} icons: ${Array.from(iconNames).join(', ')})`);
  return { skipped: false, icons: Array.from(iconNames) };
}

// Main
async function main() {
  console.log('Finding files with Icon component...');
  const files = findIconFiles();
  console.log(`Found ${files.length} files\n`);
  
  const results = {
    migrated: [],
    skippedDynamic: [],
    skippedNoIcons: [],
    errors: []
  };
  
  for (const file of files) {
    try {
      const result = transformFile(file);
      if (result.skipped) {
        if (result.reason === 'dynamic') {
          results.skippedDynamic.push(file);
        } else {
          results.skippedNoIcons.push(file);
        }
      } else {
        results.migrated.push(file);
      }
    } catch (error) {
      console.error(`ERROR: ${file}: ${error.message}`);
      results.errors.push({ file, error: error.message });
    }
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`Migrated: ${results.migrated.length} files`);
  console.log(`Skipped (dynamic names): ${results.skippedDynamic.length} files`);
  console.log(`Skipped (no static icons): ${results.skippedNoIcons.length} files`);
  console.log(`Errors: ${results.errors.length} files`);
  
  if (results.skippedDynamic.length > 0) {
    console.log('\nFiles with dynamic icon names (need manual review):');
    results.skippedDynamic.forEach(f => console.log(`  - ${f}`));
  }
  
  if (results.errors.length > 0) {
    console.log('\nFiles with errors:');
    results.errors.forEach(e => console.log(`  - ${e.file}: ${e.error}`));
  }
}

main().catch(console.error);
