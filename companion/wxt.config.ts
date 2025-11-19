import { defineConfig } from 'wxt';
import { copyFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  manifest: {
    permissions: ['activeTab', 'http://localhost:8081/*'],
    name: 'Cal.com Companion',
    description: 'Your calendar companion for quick booking and scheduling',
    version: '1.7.0',
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; frame-src 'self' http://localhost:8081;"
    },
    action: {
      default_title: 'Cal.com Companion'
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