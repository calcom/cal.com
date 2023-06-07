import type { EmbedThemeConfig } from "./embed-iframe";

export default function EmbedInitIframe() {
  if (typeof window === "undefined" || window.isEmbed) {
    return;
  }

  const embedNameSpaceFromQueryParam = new URL(document.URL).searchParams.get("embed");

  // Namespace is initially set in query param `embed` but the query param might get lost during soft navigation
  // So, we also check for the namespace in `window.name` which is set when iframe is created by embed.ts and persists for the duration of iframe's life
  // Note that, window.name isn't lost during hard navigation as well. Though, hard navigation isn't something that would happen in the app, but it's critical to be able to detect embed mode even after that(just in case)
  // We might just use window.name but if just in case something resets the `window.name`, we will still have the namespace in query param
  const embedNamespace =
    typeof embedNameSpaceFromQueryParam === "string"
      ? embedNameSpaceFromQueryParam
      : window.name.replace(/cal-embed=(.*)/, "$1").trim();

  window.isEmbed = () => {
    // By default namespace is "". That would also work if we just check the type of variable
    return typeof embedNamespace == "string";
  };

  window.getEmbedTheme = () => {
    // Note that embedStore.theme is lost if hard navigation occurs.(Though, it isn't something that we expect to happen normally)
    if (window.CalEmbed.embedStore.theme) {
      // It is important to ensure that the theme is consistent during browsing so that ThemeProvider doesn't get different themes to show and it avoids theme switching.
      return window.CalEmbed.embedStore.theme;
    }
    const url = new URL(document.URL);
    return url.searchParams.get("theme") as EmbedThemeConfig | null;
  };

  window.getEmbedNamespace = () => {
    return embedNamespace;
  };

  window.CalEmbed = window.CalEmbed || {};

  window.CalEmbed.applyCssVars = (cssVarsPerTheme) => {
    const cssVarsStyle = [];
    if (cssVarsPerTheme) {
      for (const [themeName, cssVars] of Object.entries(cssVarsPerTheme)) {
        cssVarsStyle.push(`.${themeName} {`);
        for (const [cssVarName, value] of Object.entries(cssVars)) {
          // The styles are applied inline on .light/.dark elements by the codebase(useCalcomTheme). So, to make sure embed styles take precedence, we add !important
          cssVarsStyle.push(`--${cssVarName}: ${value} !important;`);
        }
        cssVarsStyle.push(`}`);
      }
    }

    const existingStyleEl = document.head.querySelector("#embed-css-vars") as HTMLStyleElement;
    if (existingStyleEl) {
      console.warn("Existing embed CSS Vars are being reset");
      existingStyleEl.innerText = cssVarsStyle.join("\n");
      return;
    }

    const style = document.createElement("style");
    style.id = "embed-css-vars";
    style.innerText = cssVarsStyle.join("\n");
    document.head.appendChild(style);
  };
}
