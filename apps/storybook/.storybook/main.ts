import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { StorybookConfig } from '@storybook/nextjs-vite';
import { storybookOnlookPlugin } from 'storybook-onbook-plugin';
import componentLocPlugin from './vite-plugin-component-loc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Disable custom plugins for Chromatic/CI static builds
// eslint-disable-next-line turbo/no-undeclared-env-vars
const isStaticBuild = Boolean(process.env.CHROMATIC || process.env.CI);

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    // Include stories from packages/ui (components directory only, excludes node_modules)
    '../../../packages/ui/components/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    // Include stories from packages/features
    '../../../packages/features/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    // Include stories from apps/web/components
    '../../../apps/web/components/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },
  staticDirs: ['../public'],
  async viteFinal(config) {
    const { mergeConfig } = await import('vite');

    // Path aliases for apps/web components
    const webAppPath = resolve(__dirname, '../../../apps/web');

    const merged = mergeConfig(config, {
      plugins: isStaticBuild ? [] : [storybookOnlookPlugin],
      resolve: {
        alias: {
          '@components': join(webAppPath, 'components'),
          '@lib': join(webAppPath, 'lib'),
          '@server': join(webAppPath, 'server'),
          '@pages': join(webAppPath, 'pages'),
          '~': join(webAppPath, 'modules'),
        },
      },
      server: isStaticBuild
        ? {}
        : {
            hmr: {
              // E2B sandboxes use HTTPS, so we need secure WebSocket
              protocol: 'wss',
              // E2B routes through standard HTTPS port 443
              clientPort: 443,
              // The actual Storybook server port inside the sandbox
              port: 6006,
            },
            cors: true, // Allow cross-origin requests for iframe embedding
          },
    });

    // componentLocPlugin must run BEFORE Storybook's plugins so it can inject
    // data-component-loc attributes into JSX before other transforms run
    merged.plugins = [componentLocPlugin(), ...(merged.plugins ?? [])];
    return merged;
  },
};
export default config;
