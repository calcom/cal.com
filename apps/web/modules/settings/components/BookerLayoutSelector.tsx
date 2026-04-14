import Image from "next/image";
import Link from "next/link";
import { Fragment, useCallback, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import ServerTrans from "@calcom/lib/components/ServerTrans";
import { useLocale } from "@calcom/i18n/useLocale";
import { BookerLayouts, defaultBookerLayoutSettings } from "@calcom/prisma/zod-utils";
import { bookerLayoutOptions, type BookerLayoutSettings } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Checkbox } from "@coss/ui/components/checkbox";
import { CheckboxGroup } from "@coss/ui/components/checkbox-group";
import { Field, FieldItem } from "@coss/ui/components/field";
import { Fieldset } from "@coss/ui/components/fieldset";
import { Toggle, ToggleGroup, ToggleGroupSeparator } from "@coss/ui/components/toggle-group";
import { cn } from "@coss/ui/lib/utils";
import { SelectablePreviewOption } from "@coss/ui/shared/selectable-preview-option";

type BookerLayoutSelectorProps = {
  title?: string;
  description?: string;
  name?: string;
  hideHeader?: boolean;
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
  isOuterBorder?: boolean;
  user?: Partial<Pick<RouterOutputs["viewer"]["me"]["get"], "defaultBookerLayouts">>;
  isUserLoading?: boolean;
};

const defaultFieldName = "metadata.bookerLayouts";

export const BookerLayoutSelector = ({
  title,
  description,
  name,
  hideHeader = false,
  fallbackToUserSettings,
  isDark,
  isOuterBorder = false,
  user,
  isUserLoading,
}: BookerLayoutSelectorProps) => {
  const { control, getValues } = useFormContext();
  const { t } = useLocale();
  // Only fallback if event current does not have any settings, and the fallbackToUserSettings boolean is set.
  const shouldShowUserSettings = (fallbackToUserSettings && !getValues(name || defaultFieldName)) || false;

  return (
    <div className={cn("flex flex-col gap-4", isOuterBorder && "rounded-lg border p-6")}>
      {!hideHeader && (
        <div className={cn(isOuterBorder ? "" : "rounded-t-xl border p-6")}>
          <div className={cn("font-semibold", isOuterBorder ? "text-sm" : "text-base")}>
            {title ? title : t("layout")}
          </div>
          <p className="text-muted-foreground max-w-full wrap-break-word text-sm">
            {description ? description : t("bookerlayout_description")}
          </p>
        </div>
      )}
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
            isDark={isDark}
            user={user}
            isUserLoading={isUserLoading}
          />
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
  user?: Partial<Pick<RouterOutputs["viewer"]["me"]["get"], "defaultBookerLayouts">>;
  isUserLoading?: boolean;
};

type BookerLayoutState = { [key in BookerLayouts]: boolean };

const BookerLayoutFields = ({
  settings,
  onChange,
  showUserSettings,
  isDark,
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

  const enabledLayouts = Object.keys(toggleValues).filter(
    (layout) => toggleValues[layout as BookerLayouts]
  ) as BookerLayouts[];

  return (
    <div className="flex flex-col gap-6">
      <Field className="max-w-none gap-4" name="layout" render={(props) => <Fieldset {...props} />}>
        <CheckboxGroup
          className="flex w-full sm:flex-row gap-4 md:gap-6"
          value={enabledLayouts}
          onValueChange={(newValues) => {
            const typedValues = newValues as BookerLayouts[];
            const defaultStillEnabled = typedValues.includes(defaultLayout);
            onChange({
              enabledLayouts: typedValues,
              defaultLayout: defaultStillEnabled ? defaultLayout : typedValues[0] || BookerLayouts.MONTH_VIEW,
            });
          }}>
          {bookerLayoutOptions.map((layout) => (
            <FieldItem className="flex-1" key={layout}>
              <SelectablePreviewOption
                control={
                  <Checkbox
                    className="peer col-start-1 row-start-2 shrink-0 max-sm:hidden"
                    value={layout}
                    disabled={disableFields}
                  />
                }
                preview={
                  <Image
                    alt={t(`bookerlayout_${layout}`)}
                    className="h-full w-full object-cover object-center shadow-xs"
                    fill
                    sizes="(min-width: 0) 100vw"
                    src={`/bookerlayout_${layout}${isDark ? "_dark" : ""}.svg`}
                  />
                }
                label={
                  <>
                    {t(`bookerlayout_${layout}`)}
                    {defaultLayout === layout ? (
                      <span className="font-normal text-muted-foreground">({t("default")})</span>
                    ) : null}
                  </>
                }
                labelClassName="flex items-center gap-1"
              />
            </FieldItem>
          ))}
        </CheckboxGroup>
      </Field>
      <div className="flex flex-col gap-2">
        <span className="font-medium text-sm">{t("bookerlayout_default_title")}</span>
        <ToggleGroup
          onValueChange={(values) => {
            if (values[0]) onDefaultLayoutChange(values[0] as BookerLayouts);
          }}
          value={[defaultLayout]}
          variant="outline">
          {bookerLayoutOptions.map((layout) => (
            <Fragment key={layout}>
              <Toggle
                aria-label={t(`bookerlayout_${layout}`)}
                disabled={disableFields || !enabledLayouts.includes(layout)}
                value={layout}
              >
                {t(`bookerlayout_${layout}`)}
              </Toggle>
              {layout !== bookerLayoutOptions[bookerLayoutOptions.length - 1] ? (
                <ToggleGroupSeparator key={`${layout}-separator`} />
              ) : null}
            </Fragment>
          ))}
        </ToggleGroup>
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
                Appearance
              </Link>,
              <button
                type="button"
                key="override-button"
                onClick={onOverrideSettings}
                className="underline cursor-pointer">
                Override
              </button>,
            ]}
          />
        </p>
      )}
    </div>
  );
};
