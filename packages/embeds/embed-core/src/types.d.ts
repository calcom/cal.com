type Theme = "dark" | "light";
export type EmbedThemeConfig = Theme | "auto";
export type BookerLayouts = "month_view" | "week_view" | "column_view";

export interface EmbedNonStylesConfig {
  /** Default would be center */
  align?: "left";
  branding?: {
    brandColor?: string;
  };
}

export type UiConfig = {
  hideEventTypeDetails?: boolean;
  // If theme not provided we would get null
  theme?: EmbedThemeConfig | null;
  styles?: EmbedStyles & EmbedNonStylesConfig;
  //TODO: Extract from tailwind the list of all custom variables and support them in auto-completion as well as runtime validation. Followup with listing all variables in Embed Snippet Generator UI.
  cssVarsPerTheme?: Record<Theme, Record<string, string>>;
  layout?: BookerLayouts;
  colorScheme?: string | null;
};

declare global {
  interface Window {
    CalEmbed: {
      __logQueue?: unknown[];
      embedStore: typeof embedStore;
      applyCssVars: (cssVarsPerTheme: UiConfig["cssVarsPerTheme"]) => void;
    };
    CalComPageStatus: string;
    isEmbed?: () => boolean;
    getEmbedNamespace: () => string | null;
    getEmbedTheme: () => EmbedThemeConfig | null;
  }
}

export {};
