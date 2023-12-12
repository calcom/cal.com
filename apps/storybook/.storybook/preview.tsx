// adds tooltip context to all stories
import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { Preview } from "@storybook/react";
import React from "react";
import { I18nextProvider } from "react-i18next";

import type { EmbedThemeConfig } from "@calcom/embed-core/src/types";
// adds trpc context to all stories (esp. booker)
import { StorybookTrpcProvider } from "@calcom/ui";

import "../styles/globals.css";
import "../styles/storybook-styles.css";
import i18n from "./i18next";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },

    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },

    globals: {
      locale: "en",
      locales: {
        en: "English",
        fr: "Français",
      },
    },

    i18n,

    nextjs: {
      appDirectory: true,
    },
  },

  decorators: [
    (Story) => (
      <StorybookTrpcProvider>
        <TooltipProvider>
          <I18nextProvider i18n={i18n}>
            <div style={{ margin: "2rem" }}>
              <Story />
            </div>
          </I18nextProvider>
        </TooltipProvider>
      </StorybookTrpcProvider>
    ),
  ],
};

export default preview;

declare global {
  interface Window {
    getEmbedNamespace: () => string | null;
    getEmbedTheme: () => EmbedThemeConfig | null;
  }
}

window.getEmbedNamespace = () => {
  const url = new URL(document.URL);
  const namespace = url.searchParams.get("embed");
  return namespace;
};

window.getEmbedTheme = () => {
  return "auto";
};
