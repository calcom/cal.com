import type { tabs } from "../lib/EmbedTabs";
import type { useEmbedTypes } from "../lib/hooks";

export type EmbedType = "inline" | "floating-popup" | "element-click" | "email";
export type PreviewState = {
  inline: {
    width: string;
    height: string;
  };
  theme: Theme;
  floatingPopup: {
    config?: {
      layout: BookerLayouts;
    };
    [key: string]: string | boolean | undefined | Record<string, string>;
  };
  elementClick: Record<string, string>;
  palette: {
    brandColor: string;
  };
  hideEventTypeDetails: boolean;
  layout: BookerLayouts;
};

export type EmbedFramework = "react" | "HTML";
export type EmbedTabs = typeof tabs;
export type EmbedTypes = ReturnType<typeof useEmbedTypes>;
