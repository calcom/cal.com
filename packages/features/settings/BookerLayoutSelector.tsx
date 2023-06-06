import * as RadioGroup from "@radix-ui/react-radio-group";
import { Trans } from "next-i18next";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { useFlagMap } from "@calcom/features/flags/context/provider";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookerLayouts } from "@calcom/prisma/zod-utils";
import { bookerLayoutOptions, type BookerLayoutSettings } from "@calcom/prisma/zod-utils";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Label, Checkbox, Button } from "@calcom/ui";

type BookerLayoutSelectorProps = {
  title?: string;
  description?: string;
  name?: string;
  /**
   * If this boolean is set, it will show the user settings if the event does not have any settings (is null).
   * In that case it also will NOT register itself in the form, so that way when submitting the form, the
   * values won't be overridden. Because as long as the event's value is null, it will fallback to the user's
   * settings.
   */
  fallbackToUserSettings?: boolean;
};

const defaultFieldName = "metadata.bookerLayouts";

export const BookerLayoutSelector = ({
  title,
  description,
  name,
  fallbackToUserSettings,
}: BookerLayoutSelectorProps) => {
  const { control, getValues } = useFormContext();
  const { t } = useLocale();
  // Only fallback if event current does not have any settings, and the fallbackToUserSettings boolean is set.
  const shouldShowUserSettings = (fallbackToUserSettings && !getValues(name || defaultFieldName)) || false;

  const flags = useFlagMap();
  if (flags["booker-layouts"] !== true) return null;

  return (
    <>
      <Label className="mb-0">{title ? title : t("bookerlayout_title")}</Label>
      <p className="text-subtle max-w-[280px] break-words py-1 text-sm sm:max-w-[500px]">
        {description ? description : t("bookerlayout_description")}
      </p>
      <Controller
        // If the event does not have any settings, we don't want to register this field in the form.
        // That way the settings won't get saved into the event on save, but remain null. Thus keep using
        // the global user's settings.
        control={shouldShowUserSettings ? undefined : control}
        name={name || defaultFieldName}
        render={({ field: { value, onChange } }) => (
          <BookerLayoutFields
            showUserSettings={shouldShowUserSettings}
            settings={value}
            onChange={onChange}
          />
        )}
      />
    </>
  );
};

type BookerLayoutFieldsProps = {
  settings: BookerLayoutSettings;
  onChange: (settings: BookerLayoutSettings) => void;
  showUserSettings: boolean;
};

type BookerLayoutState = { [key in BookerLayouts]: boolean };

const BookerLayoutFields = ({ settings, onChange, showUserSettings }: BookerLayoutFieldsProps) => {
  const { t } = useLocale();
  const { isLoading: isUserLoading, data: user } = useMeQuery();
  const [isOverridingSettings, setIsOverridingSettings] = useState(false);

  const disableFields = showUserSettings && !isOverridingSettings;
  const shownSettings = disableFields ? user?.defaultBookerLayouts : settings;
  const defaultLayout = shownSettings?.defaultLayout || BookerLayouts.MONTH_VIEW;

  // Converts the settings array into a boolean object, which can be used as form values.
  const toggleValues: BookerLayoutState = bookerLayoutOptions.reduce((layouts, layout) => {
    layouts[layout] = !shownSettings?.enabledLayouts
      ? true
      : shownSettings.enabledLayouts.indexOf(layout) > -1;
    return layouts;
  }, {} as BookerLayoutState);

  const onLayoutToggleChange = useCallback(
    (changedLayout: BookerLayouts, checked: boolean) => {
      onChange({
        enabledLayouts: Object.keys(toggleValues).filter((layout) => {
          if (changedLayout === layout) return checked === true;
          return toggleValues[layout as BookerLayouts] === true;
        }) as BookerLayouts[],
        defaultLayout,
      });
    },
    [defaultLayout, onChange, toggleValues]
  );

  const onDefaultLayoutChange = useCallback(
    (newDefaultLayout: BookerLayouts) => {
      onChange({
        enabledLayouts: Object.keys(toggleValues).filter(
          (layout) => toggleValues[layout as BookerLayouts] === true
        ) as BookerLayouts[],
        defaultLayout: newDefaultLayout,
      });
    },
    [toggleValues, onChange]
  );

  const onOverrideSettings = () => {
    setIsOverridingSettings(true);
    // Sent default layout settings to form, otherwise it would still have 'null' as it's value.
    if (user?.defaultBookerLayouts) onChange(user.defaultBookerLayouts);
  };

  return (
    <div className="my-4 space-y-5">
      <div
        className={classNames(
          "flex flex-col gap-5 transition-opacity sm:flex-row sm:gap-3",
          disableFields && "pointer-events-none opacity-40",
          disableFields && isUserLoading && "animate-pulse"
        )}>
        {bookerLayoutOptions.map((layout) => (
          <div className="w-full" key={layout}>
            <label>
              <img
                className="mb-3 w-full max-w-none cursor-pointer"
                src={`/bookerlayout_${layout}.svg`}
                alt="Layout preview"
              />
              <Checkbox
                value={layout}
                name={`bookerlayout_${layout}`}
                description={t(`bookerlayout_${layout}`)}
                checked={toggleValues[layout]}
                onChange={(ev) => onLayoutToggleChange(layout, ev.target.checked)}
              />
            </label>
          </div>
        ))}
      </div>
      <div
        className={classNames(
          "transition-opacity",
          disableFields && "pointer-events-none opacity-40",
          disableFields && isUserLoading && "animate-pulse"
        )}>
        <Label>{t("bookerlayout_default_title")}</Label>
        <RadioGroup.Root
          key={defaultLayout}
          className="border-default flex w-full gap-2 rounded-md border p-1"
          defaultValue={defaultLayout}
          onValueChange={(layout: BookerLayouts) => onDefaultLayoutChange(layout)}>
          {bookerLayoutOptions.map((layout) => (
            <RadioGroup.Item
              className="aria-checked:bg-emphasis hover:bg-subtle focus:bg-subtle w-full rounded-[4px] p-1 text-sm transition-colors"
              key={layout}
              value={layout}>
              {t(`bookerlayout_${layout}`)}
              <RadioGroup.Indicator />
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
      </div>
      {disableFields && (
        <p className="text-sm">
          <Trans i18nKey="bookerlayout_override_global_settings">
            You can manage this for all your event types in{" "}
            <Link href="/settings/my-account/appearance" className="underline">
              settings / appearance
            </Link>{" "}
            or{" "}
            <Button
              onClick={onOverrideSettings}
              color="minimal"
              className="p-0 font-normal underline hover:bg-transparent focus-visible:bg-transparent">
              override for this event only
            </Button>
            .
          </Trans>
        </p>
      )}
    </div>
  );
};
