const fs = require('fs');

const targetVersions = {
  'next': '^15.4.5',
  'react': '^18.2.0',
  'react-dom': '^18.2.0',
  'typescript': '^5.9.0', // Remove beta, use stable
  '@types/react': '^18.2.0',
  '@types/node': '^20.17.23',
  
  'tailwindcss': '^3.4.1',
  'eslint': '^8.57.0', // Keep v8.x, not v9.x
  'postcss': '^8.4.18',
  'autoprefixer': '^10.4.19',
  
  'prisma': '^5.4.2',
  '@prisma/client': '^5.4.2',
  
  '@radix-ui/react-avatar': '^1.0.4',
  '@radix-ui/react-dialog': '^1.0.4', 
  '@radix-ui/react-dropdown-menu': '^2.0.6',
  '@radix-ui/react-select': '^1.2.2', // Keep v1.x
  '@radix-ui/react-slider': '^1.1.2',
  '@radix-ui/react-switch': '^1.0.3',
  '@radix-ui/react-tooltip': '^1.0.7',
  
  'uuid': '^8.3.2',
  'zod': '^3.22.4',
  'stripe': '^15.3.0',
  'class-variance-authority': '^0.7.1',
  'react-select': '^5.7.0',
  
  '@faker-js/faker': '^8.4.1', // Keep v8.x to avoid API changes
  '@testing-library/react': '^13.4.0', // Keep v13.x
  'msw': '^1.3.2', // Keep v1.x
  
  'vite': '^5.0.12',
  '@vitejs/plugin-react': '^4.2.1',
  'vite-plugin-dts': '^3.7.3'
};

console.log('=== REVERTING PROBLEMATIC CHANGES ===\n');

const { execSync } = require('child_process');
try {
  execSync('git checkout HEAD -- .', { stdio: 'inherit' });
  console.log('Reverted all changes to clean state');
} catch (error) {
  console.log('Could not revert changes, continuing...');
}

const packageFiles = [
  'package.json',
  'apps/web/package.json', 
  'apps/api/v2/package.json',
  'packages/ui/package.json',
  'packages/features/package.json',
  'packages/trpc/package.json',
  'packages/prisma/package.json',
  'packages/lib/package.json'
];

function updatePackageJson(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${filePath} - file not found`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const pkg = JSON.parse(content);
  let updated = false;

  ['dependencies', 'devDependencies', 'peerDependencies'].forEach(depType => {
    if (pkg[depType]) {
      Object.keys(pkg[depType]).forEach(depName => {
        if (targetVersions[depName] && pkg[depType][depName] !== targetVersions[depName]) {
          console.log(`${filePath}: ${depName} ${pkg[depType][depName]} -> ${targetVersions[depName]}`);
          pkg[depType][depName] = targetVersions[depName];
          updated = true;
        }
      });
    }
  });

  if (updated) {
    fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Updated ${filePath}`);
  } else {
    console.log(`No changes needed for ${filePath}`);
  }
}

console.log('\n=== APPLYING CONSERVATIVE UPDATES ===\n');

packageFiles.forEach(file => {
  updatePackageJson(file);
});

console.log('\n=== UPDATING YARN RESOLUTIONS ===\n');

const rootPkgPath = 'package.json';
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));

if (!rootPkg.resolutions) {
  rootPkg.resolutions = {};
}

const resolutionsToAdd = {
  'typescript': '^5.9.0',
  'react': '^18.2.0',
  'react-dom': '^18.2.0',
  '@types/react': '^18.2.0',
  '@types/node': '^20.17.23'
};

Object.entries(resolutionsToAdd).forEach(([pkg, version]) => {
  if (rootPkg.resolutions[pkg] !== version) {
    console.log(`Adding resolution: ${pkg} -> ${version}`);
    rootPkg.resolutions[pkg] = version;
  }
});

fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');

console.log('\n=== COMPLETED CONSERVATIVE UPDATES ===');
