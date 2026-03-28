import type { StorybookConfig } from '@storybook/nextjs-vite';

import { dirname, resolve } from "node:path"

import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
* This function is used to resolve the absolute path of a package.
* It is needed in projects that use Yarn PnP or are set up within a monorepo.
*/
function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)))
}
const config: StorybookConfig = {
  "stories": [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    getAbsolutePath('@storybook/addon-a11y'),
    getAbsolutePath('@storybook/addon-docs'),
    getAbsolutePath("@storybook/addon-mcp")
  ],
  "framework": getAbsolutePath('@storybook/nextjs-vite'),
  "staticDirs": [
    "../public"
  ],
  async viteFinal(config) {
    const calcomAliases: Record<string, string> = {
      '@calcom/features/bookings/Booker/BookerStoreProvider': resolve(__dirname, './mocks/BookerStoreProvider.ts'),
      '@calcom/features/components/controlled-dialog': resolve(__dirname, './mocks/controlled-dialog.tsx'),
      '@calcom/lib/hooks/useLocale': resolve(__dirname, './mocks/useLocale.ts'),
    };

    config.plugins = [
      ...(config.plugins ?? []),
      {
        name: 'calcom-storybook-shims',
        enforce: 'pre' as const,
        resolveId(source: string) {
          if (calcomAliases[source]) {
            return calcomAliases[source];
          }
          return null;
        },
      },
      {
        name: 'next-navigation-shim',
        enforce: 'pre' as const,
        transform(code: string, id: string) {
          if (id.includes('next/navigation') || id.includes('next_navigation')) {
            if (!code.includes('ReadonlyURLSearchParams')) {
              return code + '\nexport const ReadonlyURLSearchParams = URLSearchParams;\n';
            }
          }
          return code;
        },
      },
    ];

    return config;
  },
};
export default config;