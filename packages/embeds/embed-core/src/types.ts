import type { CSSProperties } from "react";

type Theme = "dark" | "light";
export type EmbedThemeConfig = Theme | "auto";

export type BookerLayouts = "month_view" | "week_view" | "column_view";
// Only allow certain styles to be modified so that when we make any changes to HTML, we know what all embed styles might be impacted.
// Keep this list to minimum, only adding those styles which are really needed.
export interface EmbedStyles {
  body?: Pick<CSSProperties, "background">;
  eventTypeListItem?: Pick<CSSProperties, "background" | "color" | "backgroundColor">;
  enabledDateButton?: Pick<CSSProperties, "background" | "color" | "backgroundColor">;
  disabledDateButton?: Pick<CSSProperties, "background" | "color" | "backgroundColor">;
  availabilityDatePicker?: Pick<CSSProperties, "background" | "color" | "backgroundColor">;
}

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
    CalComPageStatus: string;
    isEmbed?: () => boolean;
    getEmbedNamespace: () => string | null;
    getEmbedTheme: () => EmbedThemeConfig | null;
  }
}

export {};
