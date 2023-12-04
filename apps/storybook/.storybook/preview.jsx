import { I18nextProvider } from "react-i18next";

import "../styles/globals.css";
import "../styles/storybook-styles.css";
import i18n from "./i18next";

export const parameters = {
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
};

const withI18next = (Story) => (
  <I18nextProvider i18n={i18n}>
    <div style={{ margin: "2rem" }}>
      <Story />
    </div>
  </I18nextProvider>
);

export const decorators = [withI18next];

window.getEmbedNamespace = () => {
  const url = new URL(document.URL);
  const namespace = url.searchParams.get("embed");
  return namespace;
};

window.getEmbedTheme = () => {
  return "auto";
};
