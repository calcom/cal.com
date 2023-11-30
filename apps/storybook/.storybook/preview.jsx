import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
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
  nextRouter: {
    pathname: "/",
    asPath: "/",
    query: {},
    push() {},
    Provider: AppRouterContext.Provider,
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
    router: {
      pathname: "/",
      asPath: "/",
      query: {},
      push() {},
      Provider: AppRouterContext.Provider,
    },
  },
};

export const decorators = [
  (Story) => (
    <I18nextProvider i18n={i18n}>
      <div style={{ margin: "2rem" }}>{Story()}</div>
    </I18nextProvider>
  ),
];

window.getEmbedNamespace = () => {
  const url = new URL(document.URL);
  const namespace = url.searchParams.get("embed");
  return namespace;
};

window.getEmbedTheme = () => {
  return "auto";
};
