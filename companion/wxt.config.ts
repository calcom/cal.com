import { defineConfig } from 'wxt';
import { copyFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  manifest: {
    permissions: ['activeTab'],
    name: 'Cal.com Companion',
    description: 'Your calendar companion for quick booking and scheduling',
    version: '1.2.0',
    web_accessible_resources: [
      {
        resources: ["expo/*", "assets/*", "favicon.ico", "index.html"],
        matches: ["<all_urls>"]
      }
    ],
    action: {
      default_title: "Cal.com Companion",
      default_popup: "popup.html"
    }
  },
  srcDir: 'extension',
  publicDir: 'dist',
  vite: () => ({
    resolve: {
      alias: {
        'react-native': 'react-native-web',
      },
    },
    define: {
      global: 'globalThis',
      __DEV__: JSON.stringify(false),
    },
    optimizeDeps: {
      include: ['react-native-web'],
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
  }),
});