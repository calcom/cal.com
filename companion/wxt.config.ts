import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    permissions: ['activeTab'],
    name: 'Cal.com Companion',
    description: 'Your calendar companion for quick booking and scheduling',
    version: '1.0.0'
  },
  srcDir: 'extension'
});