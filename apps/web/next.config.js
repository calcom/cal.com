
// Import backup config
const baseConfig = require('./next.config.backup.js');

// Handle both function and object configs
const originalConfig = typeof baseConfig === 'function' ? baseConfig() : baseConfig;

if (!originalConfig || Object.keys(originalConfig).length === 0) {
  throw new Error('Next.js config is empty or invalid. Check backup config.');
}

// Ensure transpilePackages is present
if (!originalConfig.transpilePackages) {
  throw new Error('transpilePackages is required in next.config.js but was not found.');
}

// Create new config with modified distDir
const config = {
  ...originalConfig,
  distDir: '/Users/hariom/code/cal.com/apps/web/.next-2',
};

// Export as a function to match Next.js expectations
module.exports = () => config;
