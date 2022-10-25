export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  nextRouter: {
    Provider: RouterContext.Provider,
  },
};

window.getEmbedNamespace = () => {
  const url = new URL(document.URL);
  const namespace = url.searchParams.get("embed");
  return namespace;
};

window.getEmbedTheme = () => {
  return "auto";
};
