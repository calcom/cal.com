import type { tabs } from "../lib/EmbedTabs";
import type { useEmbedTypes } from "../lib/hooks";

export type EmbedType = "inline" | "floating-popup" | "element-click" | "email";
type EmbedConfig = {
  layout?: BookerLayouts;
  theme?: Theme;
};
export type PreviewState = {
  inline: {
    width: string;
    height: string;
    config?: EmbedConfig;
  };
  theme: Theme;
  floatingPopup: {
    config?: EmbedConfig;
    hideButtonIcon?: boolean;
    buttonPosition?: "bottom-left" | "bottom-right";
    buttonColor?: string;
    buttonTextColor?: string;
  };
  elementClick: {
    config?: EmbedConfig;
  };
  palette: {
    brandColor: string;
  };
  hideEventTypeDetails: boolean;
  layout: BookerLayouts;
};

export type EmbedFramework = "react" | "HTML";
export type EmbedTabs = typeof tabs;
export type EmbedTypes = ReturnType<typeof useEmbedTypes>;
