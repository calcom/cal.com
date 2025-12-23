import type { Preview } from '@storybook/nextjs-vite';
import '../src/styles/globals.css';
import { withThemeByClassName } from '@storybook/addon-themes';
import { Provider as TooltipProvider } from '@radix-ui/react-tooltip';
import { ElementInspector } from './components/ElementInspector';
import { IframeKeyboardRelay } from './components/IframeKeyboardRelay';
import { IframeReloadListener } from './components/IframeReloadListener';
import SVG from 'react-inlinesvg';

// Disable iframe communication components for static builds (Chromatic/CI)
// eslint-disable-next-line turbo/no-undeclared-env-vars
const isStaticBuild = Boolean(process.env.CHROMATIC || process.env.CI);

// Load cal.com icon sprites
function IconSprites() {
  return <SVG src="/icons/sprite.svg" />;
}

const preview: Preview = {
  decorators: [
    withThemeByClassName({
      themes: {
        light: 'light',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
    (Story) => (
      <TooltipProvider>
        <IconSprites />
        {!isStaticBuild && <IframeReloadListener />}
        {!isStaticBuild && <IframeKeyboardRelay />}
        {!isStaticBuild && <ElementInspector />}
        <div className="font-sans">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#0a0a0a',
        },
      ],
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },

    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/',
      },
    },
  },
};

export default preview;
