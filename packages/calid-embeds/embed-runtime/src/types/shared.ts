import type { CSSProperties } from "react";

export type ThemeOption = "dark" | "light" | "auto";
export type BookerLayout = "month_view" | "week_view" | "column_view";
export type LayoutOption = BookerLayout | "mobile";

export type PageKind =
  | "team.event.booking.slots"
  | "user.event.booking.slots"
  | "team.event.booking.form"
  | "user.event.booking.form";

export interface StylesMap {
  body?: Pick<CSSProperties, "background">;
  eventTypeListItem?: Pick<CSSProperties, "background" | "color" | "backgroundColor">;
  enabledDateButton?: Pick<CSSProperties, "background" | "color" | "backgroundColor">;
  disabledDateButton?: Pick<CSSProperties, "background" | "color" | "backgroundColor">;
  availabilityDatePicker?: Pick<CSSProperties, "background" | "color" | "backgroundColor">;
}

export interface NonStyleConfig {
  align?: "left";
  branding?: { brandColor?: string };
}

export type UiOptions = {
  hideEventTypeDetails?: boolean;
  theme?: ThemeOption | null;
  styles?: StylesMap & NonStyleConfig;
  cssVarsPerTheme?: Record<"dark" | "light", Record<string, string>>;
  layout?: BookerLayout;
  colorScheme?: string | null;
};

export type KnownParams = {
  "flag.coep"?: "true" | "false";
  layout?: BookerLayout;
  "ui.color-scheme"?: string;
  theme?: ThemeOption;
  "cal.embed.pageType"?: PageKind;
  "cal.embed.noSlotsFetchOnConnect"?: "true" | "false";
};

export type BookerEmbedState =
  | "initializing"
  | "slotsPending"
  | "slotsLoading"
  | "slotsDone"
  | "slotsLoadingError";

export type SlotQueryStatus = {
  isPending?: boolean;
  isError?: boolean;
  isSuccess?: boolean;
  isLoading?: boolean;
};

export type EmbedConfig = Record<string, string | string[] | Record<string, string>> & {
  iframeAttrs?: Record<string, string> & { id?: string };
} & KnownParams;

export type StyleSetter = React.Dispatch<React.SetStateAction<StylesMap>>;
export type NonStyleSetter = React.Dispatch<React.SetStateAction<NonStyleConfig>>;

export type PrerenderConfig = {
  slotsStaleTimeMs?: number;
  iframeForceReloadThresholdMs?: number;
  backgroundSlotsFetch?: boolean;
};

declare global {
  interface Window {
    CalComPageStatus: string;
    isEmbed?: () => boolean;
    getEmbedNamespace: () => string | null;
    getEmbedTheme: () => ThemeOption | null;
  }
}
