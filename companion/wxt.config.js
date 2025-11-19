import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'extension',
  entrypointsDir: 'entrypoints',
  outDir: '.output',
  manifest: {
    name: 'Cal.com Companion',
    version: '1.7.0',
    description: 'Your calendar companion for quick booking and scheduling',
    permissions: ['activeTab', 'http://localhost:8081/*'],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; frame-src 'self' http://localhost:8081;"
    },
    action: {
      default_title: 'Cal.com Companion'
    }
  },
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