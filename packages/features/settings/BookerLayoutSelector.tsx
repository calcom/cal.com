import { Button } from "@calid/features/ui/components/button";
import { CheckboxField } from "@calid/features/ui/components/input/checkbox-field";
import { Label } from "@calid/features/ui/components/label";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import ServerTrans from "@calcom/lib/components/ServerTrans";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookerLayouts, defaultBookerLayoutSettings } from "@calcom/prisma/zod-utils";
import { bookerLayoutOptions, type BookerLayoutSettings } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";

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
  isLoading?: boolean;
  isDisabled?: boolean;
  isOuterBorder?: boolean;
  user?: Partial<Pick<RouterOutputs["viewer"]["me"]["get"], "defaultBookerLayouts">>;
  isUserLoading?: boolean;
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
  isLoading = false,
  user,
  isUserLoading,
}: BookerLayoutSelectorProps) => {
  const { control, getValues } = useFormContext();
  const { t } = useLocale();
  // Only fallback if event current does not have any settings, and the fallbackToUserSettings boolean is set.
  const shouldShowUserSettings = (fallbackToUserSettings && !getValues(name || defaultFieldName)) || false;

  return (
    <div
      className={classNames(
        isOuterBorder && "border-default rounded-lg border p-6",
        !isOuterBorder && "border-subtle rounded-b-md border-x border-b pb-4"
      )}>
      <div
        className={classNames(
          isOuterBorder ? "pb-5" : "border-subtle rounded-t-xl border-x border-t px-6 pt-6"
        )}>
        <Label className={classNames("text-default text-sm font-semibold")}>
          {title ? title : t("layout")}
        </Label>
        <p className="text-subtle max-w-full break-words text-sm leading-tight">
          {description ? description : t("bookerlayout_description")}
        </p>
      </div>
      <Controller
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
              user={user}
              isUserLoading={isUserLoading}
            />
            {!isOuterBorder && (
              <Button
                className="ml-6"
                loading={isLoading}
                type="submit"
                disabled={isDisabled}
                color="primary">
                {t("update")}
              </Button>
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
  user?: Partial<Pick<RouterOutputs["viewer"]["me"]["get"], "defaultBookerLayouts">>;
  isUserLoading?: boolean;
};

type BookerLayoutState = { [key in BookerLayouts]: boolean };

const BookerLayoutFields = ({
  settings,
  onChange,
  showUserSettings,
  isDark,
  isOuterBorder,
  user,
  isUserLoading,
}: BookerLayoutFieldsProps) => {
  const { t } = useLocale();
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
    <div className={classNames("space-y-5", !isOuterBorder && "border-subtle border-x px-6 pb-6 pt-8")}>
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
              <div className="flex flex-row items-center gap-2">
                <CheckboxField
                  value={layout}
                  checked={toggleValues[layout]}
                  onCheckedChange={(checked) => {
                    onLayoutToggleChange(layout, checked);
                  }}
                />
                <div>{t(`bookerlayout_${layout}`)}</div>
              </div>
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
        <Label className="mr-2">{t("bookerlayout_default_title")}</Label>

        {bookerLayoutOptions.map((layout) => (
          <Button
            disabled={toggleValues[layout] === false}
            className="mr-2 px-4"
            color={defaultLayout === layout ? "primary" : "secondary"}
            onClick={() => {
              onDefaultLayoutChange(layout);
            }}>
            {t(`bookerlayout_${layout}`)}
          </Button>
        ))}
      </div>
      {disableFields && (
        <p className="text-sm">
          <ServerTrans
            t={t}
            i18nKey="bookerlayout_override_global_settings"
            components={[
              <Link
                key="appearance-link"
                target="_blank"
                href="/settings/my-account/appearance"
                className="underline">
                {t("appearance")}
              </Link>,
              <Button
                key="override-button"
                onClick={onOverrideSettings}
                color="minimal"
                className="text-emphasis border-none p-0 font-normal underline">
                {t("override")}
              </Button>,
            ]}
          />
        </p>
      )}
    </div>
  );
};
