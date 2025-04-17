import type { CSSProperties } from "react";

type Theme = "dark" | "light";
export type EmbedThemeConfig = Theme | "auto";

export type BookerLayouts = "month_view" | "week_view" | "column_view";
export type AllPossibleLayouts = BookerLayouts | "mobile";
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

export type EmbedPageType =
  // First page of booker for team event
  | "team.event.booking.slots"
  // First page of booker for user event
  | "user.event.booking.slots"
  // Booking Form(Second page of booker) for team event
  | "team.event.booking.form"
  // Booking Form(Second page of booker) for user event
  | "user.event.booking.form";

export type KnownConfig = {
  // TODO: It should have a dedicated prefill prop
  // prefill: {},
  "flag.coep"?: "true" | "false";

  // TODO: Move layout and theme as nested props of ui as it makes it clear that these two can be configured using `ui` instruction as well any time.
  // ui: {layout; theme}
  layout?: BookerLayouts;
  // TODO: Rename layout and theme as ui.layout and ui.theme as it makes it clear that these two can be configured using `ui` instruction as well any time.
  "ui.color-scheme"?: string;
  theme?: EmbedThemeConfig;
  // Prefixing with cal.embed because there could be more query params that aren't required by embed and are used for things like prefilling booking form, configuring dry run, and some other params simply to be forwarded to the booking success redirect URL.
  // There are some cal. prefixed query params as well, not meant for embed specifically, but in general for cal.com
  "cal.embed.pageType"?: EmbedPageType;
};

export {};
