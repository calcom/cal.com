import type { Brand } from "@calcom/types/utils";

import type { tabs } from "../lib/EmbedTabs";
import type { useEmbedTypes } from "../lib/hooks";

export type EmbedType = "inline" | "floating-popup" | "element-click" | "email";
type EmbedConfig = {
  layout?: BookerLayouts;
  theme?: Theme;
};

export type PreviewState = {
  inline: Brand<
    {
      width: string;
      height: string;
      config?: EmbedConfig;
    },
    "inline"
  >;
  theme: Theme;
  floatingPopup: Brand<
    {
      config?: EmbedConfig;
      hideButtonIcon?: boolean;
      buttonPosition?: "bottom-left" | "bottom-right";
      buttonColor?: string;
      buttonTextColor?: string;
    },
    "floating-popup"
  >;
  elementClick: Brand<
    {
      config?: EmbedConfig;
    },
    "element-click"
  >;
  palette: {
    brandColor: string | null;
    darkBrandColor: string | null;
  };
  hideEventTypeDetails: boolean;
  layout: BookerLayouts;
};

export type EmbedFramework = "react" | "HTML";
export type EmbedTabs = typeof tabs;
export type EmbedTypes = ReturnType<typeof useEmbedTypes>;
