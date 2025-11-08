import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  manifest: {
    name: 'Cal.com Companion',
    version: '1.0.0',
    description: 'Cal.com companion app for managing your scheduling',
    permissions: [],
  },
});
