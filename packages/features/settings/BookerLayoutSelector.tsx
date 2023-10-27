import * as RadioGroup from "@radix-ui/react-radio-group";
import { Trans } from "next-i18next";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { useFlagMap } from "@calcom/features/flags/context/provider";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookerLayouts, defaultBookerLayoutSettings } from "@calcom/prisma/zod-utils";
import { bookerLayoutOptions, type BookerLayoutSettings } from "@calcom/prisma/zod-utils";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Label, CheckboxField, Button } from "@calcom/ui";

import SectionBottomActions from "./SectionBottomActions";

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
  /**
   * isDark boolean should be passed in when the user selected 'dark mode' in the theme settings in profile/appearance.
   * So it's not based on the user's system settings, but on the user's preference for the booker.
   * This boolean is then used to show a dark version of the layout image. It's only easthetic, no functionality is attached
   * to this boolean.
   */
  isDark?: boolean;

  isDisabled?: boolean;
  isOuterBorder?: boolean;
};

const defaultFieldName = "metadata.bookerLayouts";

export const BookerLayoutSelector = ({
  title,
  description,
  name,
  fallbackToUserSettings,
  isDark,
  isDisabled = false,
  isOuterBorder = false,
}: BookerLayoutSelectorProps) => {
  const { control, getValues } = useFormContext();
  const { t } = useLocale();
  // Only fallback if event current does not have any settings, and the fallbackToUserSettings boolean is set.
  const shouldShowUserSettings = (fallbackToUserSettings && !getValues(name || defaultFieldName)) || false;

  const flags = useFlagMap();
  if (flags["booker-layouts"] !== true) return null;

  return (
    <div className={classNames(isOuterBorder && "border-subtle rounded-lg border p-6")}>
      <div className={classNames(isOuterBorder ? "pb-5" : "border-subtle rounded-t-xl border p-6")}>
        <Label className={classNames("mb-1 font-semibold", isOuterBorder ? "text-sm" : "text-base")}>
          {title ? title : t("layout")}
        </Label>
        <p className="text-subtle max-w-full break-words text-sm leading-tight">
          {description ? description : t("bookerlayout_description")}
        </p>
      </div>
      <Controller
        // If the event does not have any settings, we don't want to register this field in the form.
        // That way the settings won't get saved into the event on save, but remain null. Thus keep using
        // the global user's settings.
        control={shouldShowUserSettings ? undefined : control}
        name={name || defaultFieldName}
        render={({ field: { value, onChange } }) => (
          <>
            <BookerLayoutFields
              showUserSettings={shouldShowUserSettings}
              settings={value}
              onChange={onChange}
              isDark={isDark}
              isOuterBorder={isOuterBorder}
            />
            {!isOuterBorder && (
              <SectionBottomActions align="end">
                <Button type="submit" disabled={isDisabled} color="primary">
                  {t("update")}
                </Button>
              </SectionBottomActions>
            )}
          </>
        )}
      />
    </div>
  );
};

type BookerLayoutFieldsProps = {
  settings: BookerLayoutSettings;
  onChange: (settings: BookerLayoutSettings) => void;
  showUserSettings: boolean;
  isDark?: boolean;
  isOuterBorder?: boolean;
};

type BookerLayoutState = { [key in BookerLayouts]: boolean };

const BookerLayoutFields = ({
  settings,
  onChange,
  showUserSettings,
  isDark,
  isOuterBorder,
}: BookerLayoutFieldsProps) => {
  const { t } = useLocale();
  const { isLoading: isUserLoading, data: user } = useMeQuery();
  const [isOverridingSettings, setIsOverridingSettings] = useState(false);

  const disableFields = showUserSettings && !isOverridingSettings;
  const shownSettings = disableFields ? user?.defaultBookerLayouts : settings;
  const defaultLayout = shownSettings?.defaultLayout || BookerLayouts.MONTH_VIEW;

  // Converts the settings array into a boolean object, which can be used as form values.
  const toggleValues: BookerLayoutState = bookerLayoutOptions.reduce((layouts, layout) => {
    layouts[layout] = !shownSettings?.enabledLayouts
      ? defaultBookerLayoutSettings.enabledLayouts.indexOf(layout) > -1
      : shownSettings.enabledLayouts.indexOf(layout) > -1;
    return layouts;
  }, {} as BookerLayoutState);

  const onLayoutToggleChange = useCallback(
    (changedLayout: BookerLayouts, checked: boolean) => {
      const newEnabledLayouts = Object.keys(toggleValues).filter((layout) => {
        if (changedLayout === layout) return checked === true;
        return toggleValues[layout as BookerLayouts] === true;
      }) as BookerLayouts[];

      const isDefaultLayoutToggledOff = newEnabledLayouts.indexOf(defaultLayout) === -1;
      const firstEnabledLayout = newEnabledLayouts[0];

      onChange({
        enabledLayouts: newEnabledLayouts,
        // If default layout is toggled off, we set the default layout to the first enabled layout
        // if there's none enabled, we set it to month view.
        defaultLayout: isDefaultLayoutToggledOff
          ? firstEnabledLayout || BookerLayouts.MONTH_VIEW
          : defaultLayout,
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
    <div className={classNames("space-y-5", !isOuterBorder && "border-subtle border-x px-6 py-8")}>
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
                src={`/bookerlayout_${layout}${isDark ? "_dark" : ""}.svg`}
                alt="Layout preview"
              />
              <CheckboxField
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
        hidden={Object.values(toggleValues).filter((value) => value === true).length <= 1}
        className={classNames(
          "transition-opacity",
          disableFields && "pointer-events-none opacity-40",
          disableFields && isUserLoading && "animate-pulse"
        )}>
        <Label>{t("bookerlayout_default_title")}</Label>
        <RadioGroup.Root
          key={defaultLayout}
          className="border-subtle flex w-full gap-2 rounded-md border p-1"
          defaultValue={defaultLayout}
          onValueChange={(layout: BookerLayouts) => onDefaultLayoutChange(layout)}>
          {bookerLayoutOptions.map((layout) => (
            <RadioGroup.Item
              className="aria-checked:bg-emphasis hover:[&:not(:disabled)]:bg-subtle focus:[&:not(:disabled)]:bg-subtle w-full rounded-[4px] p-1 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              disabled={toggleValues[layout] === false}
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
            You can manage this for all your event types in Settings {"-> "}
            <Link href="/settings/my-account/appearance" className="underline">
              Appearance
            </Link>{" "}
            or{" "}
            <Button
              onClick={onOverrideSettings}
              color="minimal"
              className="h-fit p-0 font-normal underline hover:bg-transparent focus-visible:bg-transparent">
              Override
            </Button>{" "}
            for this event only.
          </Trans>
        </p>
      )}
    </div>
  );
};
