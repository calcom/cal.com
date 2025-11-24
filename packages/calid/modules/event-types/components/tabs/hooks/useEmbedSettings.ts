// packages/calid/modules/event-types/components/tabs/hooks/useEmbedSettings.ts
import { useState, useCallback } from "react";

import { EmbedTheme } from "@calcom/features/embed/lib/constants";
import { BookerLayouts } from "@calcom/prisma/zod-utils";

export interface EmbedSettings {
  theme: EmbedTheme;
  hideEventTypeDetails: boolean;
  lightBrandColor: string;
  darkBrandColor: string;
  layout: BookerLayouts;
  buttonText: string;
  displayCalendarIcon: boolean;
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  buttonColor: string;
  textColor: string;
  windowWidth: string;
  windowHeight: string;
}

interface UseEmbedSettingsProps {
  defaultBrandColor?: string;
  defaultDarkBrandColor?: string;
  eventType?: any; // MANUAL: Add proper type from your event type
}

export const useEmbedSettings = ({
  defaultBrandColor = "007ee5",
  defaultDarkBrandColor = "fafafa",
  eventType,
}: UseEmbedSettingsProps) => {
  const [embedSettings, setEmbedSettings] = useState<EmbedSettings>({
    theme: EmbedTheme.auto,
    hideEventTypeDetails: false,
    lightBrandColor: defaultBrandColor.replace("#", ""),
    darkBrandColor: defaultDarkBrandColor.replace("#", ""),
    layout: BookerLayouts.MONTH_VIEW,
    buttonText: "Book my Cal ID",
    displayCalendarIcon: true,
    position: "bottom-right",
    buttonColor: "000000",
    textColor: "ffffff",
    windowWidth: "100",
    windowHeight: "100",
  });

  const updateSetting = useCallback((key: keyof EmbedSettings, value: any) => {
    setEmbedSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setEmbedSettings({
      theme: EmbedTheme.auto,
      hideEventTypeDetails: false,
      lightBrandColor: defaultBrandColor.replace("#", ""),
      darkBrandColor: defaultDarkBrandColor.replace("#", ""),
      layout: BookerLayouts.MONTH_VIEW,
      buttonText: "Book my Cal ID",
      displayCalendarIcon: true,
      position: "bottom-right",
      buttonColor: "000000",
      textColor: "ffffff",
      windowWidth: "100",
      windowHeight: "100",
    });
  }, [defaultBrandColor, defaultDarkBrandColor]);

  const getConfigForEmbedType = useCallback(
    (embedType: string) => {
      const baseConfig = {
        theme: embedSettings.theme,
        layout: embedSettings.layout,
        hideEventTypeDetails: embedSettings.hideEventTypeDetails,
      };

      switch (embedType) {
        case "inline":
          return {
            ...baseConfig,
            width: embedSettings.windowWidth,
            height: embedSettings.windowHeight,
          };
        case "floating-popup":
          return {
            ...baseConfig,
            buttonText: embedSettings.buttonText,
            buttonPosition: embedSettings.position,
            buttonColor: embedSettings.buttonColor,
            buttonTextColor: embedSettings.textColor,
            hideButtonIcon: !embedSettings.displayCalendarIcon,
          };
        case "element-click":
          return baseConfig;
        default:
          return baseConfig;
      }
    },
    [embedSettings]
  );

  return {
    embedSettings,
    updateSetting,
    resetSettings,
    getConfigForEmbedType,
  };
};
