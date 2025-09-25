import { Icon } from "@calid/features/ui/components/icon";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import React, { useState } from "react";
import { components } from "react-select";

import { EmbedTheme } from "@calcom/features/embed/lib/constants";
import type { EmbedTypes } from "@calcom/features/embed/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookerLayouts } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { ColorPicker, Label, Select, Switch, TextField } from "@calcom/ui/components/form";

type EventType = RouterOutputs["viewer"]["eventTypes"]["calid_get"]["eventType"] | undefined;

interface EmbedOptionsProps {
  embedType: keyof typeof EmbedTypes;
  embedSettings: any; // You'll want to type this properly based on your settings structure
  onSettingChange: (key: string, value: any) => void;
  eventType?: EventType;
  isEmailEmbed?: boolean;
}

const ThemeSelectControl = ({ children, ...props }: any) => {
  return (
    <components.Control {...props}>
      <Icon name="sun" className="text-subtle mr-2 h-4 w-4" />
      {children}
    </components.Control>
  );
};

export const EmbedOptions: React.FC<EmbedOptionsProps> = ({
  embedType,
  embedSettings,
  onSettingChange,
  eventType,
  isEmailEmbed = false,
}) => {
  const { t } = useLocale();
  const [isEmbedCustomizationOpen, setIsEmbedCustomizationOpen] = useState(true);
  const [isBookingCustomizationOpen, setIsBookingCustomizationOpen] = useState(true);

  // Theme options
  const ThemeOptions = [
    { value: EmbedTheme.auto, label: "Auto" },
    { value: EmbedTheme.dark, label: "Dark Theme" },
    { value: EmbedTheme.light, label: "Light Theme" },
  ];

  // Layout options
  const layoutOptions = [
    { value: BookerLayouts.MONTH_VIEW, label: t("bookerlayout_month_view") },
    { value: BookerLayouts.WEEK_VIEW, label: t("bookerlayout_week_view") },
    { value: BookerLayouts.COLUMN_VIEW, label: t("bookerlayout_column_view") },
  ];

  // Floating popup position options
  const FloatingPopupPositionOptions = [
    { value: "bottom-right" as const, label: "Bottom right" },
    { value: "bottom-left" as const, label: "Bottom left" },
  ];

  if (isEmailEmbed) {
    return (
      <div className="space-y-6">
        <div className="text-sm text-gray-600">{t("email_embed_instructions")}</div>
        {/* Email embed doesn't need configuration options */}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Embed Customization Section */}
      {embedType !== "element-click" && (
        <Collapsible open={isEmbedCustomizationOpen} onOpenChange={setIsEmbedCustomizationOpen}>
          <CollapsibleTrigger asChild>
            <Button
              color="minimal"
              className="flex w-full items-center justify-between p-0 font-medium hover:bg-transparent">
              <span>{t("embed_customization")}</span>
              <Icon
                name="chevron-down"
                className={`h-4 w-4 transition-transform ${isEmbedCustomizationOpen ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            {/* Inline Embed Dimensions */}
            {embedType === "inline" && (
              <div>
                <Label className="mb-2 block text-sm font-medium">{t("window_sizing")}</Label>
                <div className="flex space-x-2">
                  <TextField
                    placeholder="100%"
                    value={embedSettings.width || "100%"}
                    onChange={(e) => onSettingChange("width", e.target.value)}
                    addOnLeading="W"
                    className="flex-1"
                  />
                  <TextField
                    placeholder="100%"
                    value={embedSettings.height || "100%"}
                    onChange={(e) => onSettingChange("height", e.target.value)}
                    addOnLeading="H"
                    className="flex-1"
                  />
                </div>
              </div>
            )}

            {/* Floating Popup Settings */}
            {embedType === "floating-popup" && (
              <>
                <div>
                  <Label className="mb-2 block text-sm font-medium">{t("button_text")}</Label>
                  <TextField
                    placeholder={t("book_my_cal")}
                    value={embedSettings.buttonText || t("book_my_cal")}
                    onChange={(e) => onSettingChange("buttonText", e.target.value)}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={!embedSettings.hideButtonIcon}
                    onCheckedChange={(checked) => onSettingChange("hideButtonIcon", !checked)}
                  />
                  <Label className="text-sm">{t("display_calendar_icon")}</Label>
                </div>

                <div>
                  <Label className="mb-2 block text-sm font-medium">{t("button_position")}</Label>
                  <Select
                    value={FloatingPopupPositionOptions.find(
                      (option) => option.value === embedSettings.buttonPosition
                    )}
                    onChange={(option) => onSettingChange("buttonPosition", option?.value)}
                    options={FloatingPopupPositionOptions}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block text-sm font-medium">{t("button_color")}</Label>
                    <ColorPicker
                      defaultValue={embedSettings.buttonColor || "#000000"}
                      onChange={(color) => onSettingChange("buttonColor", color)}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm font-medium">{t("text_color")}</Label>
                    <ColorPicker
                      defaultValue={embedSettings.buttonTextColor || "#ffffff"}
                      onChange={(color) => onSettingChange("buttonTextColor", color)}
                    />
                  </div>
                </div>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Booking Customization Section */}
      <Collapsible open={isBookingCustomizationOpen} onOpenChange={setIsBookingCustomizationOpen}>
        <CollapsibleTrigger asChild>
          <Button
            color="secondary"
            className="flex w-full items-center justify-between p-0 font-medium hover:bg-transparent">
            <span>{t("booking_customization")}</span>
            <Icon
              name="chevron-down"
              className={`h-4 w-4 transition-transform ${isBookingCustomizationOpen ? "rotate-180" : ""}`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Theme Selection */}
          <div>
            <Label className="mb-2 block text-sm font-medium">{t("theme")}</Label>
            <Select
              value={ThemeOptions.find((option) => option.value === embedSettings.theme)}
              onChange={(option) => onSettingChange("theme", option?.value)}
              options={ThemeOptions}
              components={{
                Control: ThemeSelectControl,
                IndicatorSeparator: () => null,
              }}
            />
          </div>

          {/* Layout Selection */}
          <div>
            <Label className="mb-2 block text-sm font-medium">{t("layout")}</Label>
            <Select
              value={layoutOptions.find((option) => option.value === embedSettings.layout)}
              onChange={(option) => onSettingChange("layout", option?.value)}
              options={layoutOptions}
            />
          </div>

          {/* Hide Event Type Details */}
          <div className="flex items-center space-x-2">
            <Switch
              checked={embedSettings.hideEventTypeDetails || false}
              onCheckedChange={(checked) => onSettingChange("hideEventTypeDetails", checked)}
            />
            <Label className="text-sm">{t("hide_eventtype_details")}</Label>
          </div>

          {/* Brand Colors */}
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block text-sm font-medium">{t("light_brand_color")}</Label>
              <ColorPicker
                defaultValue={embedSettings.brandColor || "#000000"}
                onChange={(color) => onSettingChange("brandColor", color)}
              />
            </div>

            <div>
              <Label className="mb-2 block text-sm font-medium">{t("dark_brand_color")}</Label>
              <ColorPicker
                defaultValue={embedSettings.darkBrandColor || "#ffffff"}
                onChange={(color) => onSettingChange("darkBrandColor", color)}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
