import * as RadioGroup from "@radix-ui/react-radio-group";
import { useCallback } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { BookerLayouts } from "@calcom/prisma/zod-utils";
import { bookerLayoutOptions, type BookerLayoutSettings } from "@calcom/prisma/zod-utils";
import { Label, Checkbox } from "@calcom/ui";

export const BookerLayoutSelector = () => {
  const { control } = useFormContext();
  const { t } = useLocale();
  return (
    <>
      <Label className="mb-0">{t("bookerlayout_title")}</Label>
      <p className="text-subtle max-w-[280px] break-words py-1 text-sm sm:max-w-[500px]">
        {t("bookerlayout_description")}
      </p>
      <Controller
        control={control}
        name="bookerLayouts"
        render={({ field: { value, onChange } }) => (
          <BookerLayoutFields settings={value} onChange={onChange} />
        )}
      />
    </>
  );
};

type BookerLayoutFieldsProps = {
  settings: BookerLayoutSettings;
  onChange: (settings: BookerLayoutSettings) => void;
};

type BookerLayoutState = { [key in BookerLayouts]: boolean };

const BookerLayoutFields = ({ settings, onChange }: BookerLayoutFieldsProps) => {
  const { t } = useLocale();

  const defaultLayout = settings?.defaultLayout || "MONTH_VIEW";

  const toggleValues: BookerLayoutState = bookerLayoutOptions.reduce((layouts, layout) => {
    layouts[layout] = !settings?.enabledLayouts ? true : settings.enabledLayouts.indexOf(layout) > -1;
    return layouts;
  }, {} as BookerLayoutState);

  const onSettingsChange = useCallback(
    (settings: BookerLayoutSettings) => {
      onChange(settings);
    },
    [onChange]
  );

  const onLayoutToggleChange = useCallback(
    (changedLayout: BookerLayouts, checked: boolean) => {
      onSettingsChange({
        enabledLayouts: Object.keys(toggleValues).filter((layout) => {
          if (changedLayout === layout) return checked === true;
          return toggleValues[layout as BookerLayouts] === true;
        }) as BookerLayouts[],
        defaultLayout,
      });
    },
    [defaultLayout, onSettingsChange, toggleValues]
  );

  const onDefaultLayoutChange = useCallback(
    (newDefaultLayout: BookerLayouts) => {
      onSettingsChange({
        enabledLayouts: Object.keys(toggleValues).filter(
          (layout) => toggleValues[layout as BookerLayouts] === true
        ) as BookerLayouts[],
        defaultLayout: newDefaultLayout,
      });
    },
    [onSettingsChange, toggleValues]
  );

  return (
    <div className="my-4 space-y-5">
      <div className="flex">
        {bookerLayoutOptions.map((layout) => (
          <div className="w-full" key={layout}>
            <label>
              <img className="mb-3 cursor-pointer" src={`/bookerlayout_${layout}.svg`} alt="Layout preview" />
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
      <div>
        <Label>{t("bookerlayout_default_title")}</Label>
        <RadioGroup.Root
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
    </div>
  );
};
