"use client";

import { fallBackHex, isValidHexCode } from "@calcom/lib/getBrandColours";
import { useLocale } from "@calcom/i18n/useLocale";
import { Button } from "@coss/ui/components/button";
import { Group, GroupSeparator } from "@coss/ui/components/group";
import { Popover, PopoverPopup, PopoverTrigger } from "@coss/ui/components/popover";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@coss/ui/components/tooltip";
import { RotateCcwIcon } from "@coss/ui/icons";
import { useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";

export type ColorPickerProps = {
  defaultValue: string;
  onChange: (text: string) => void;
  container?: HTMLElement;
  popoverAlign?: React.ComponentProps<typeof PopoverPopup>["align"];
  className?: string;
  resetDefaultValue?: string;
  useDefaultLabel?: string;
};

const ColorPicker = (props: ColorPickerProps) => {
  const { t } = useLocale();
  const init = !isValidHexCode(props.defaultValue)
    ? fallBackHex(props.defaultValue, false)
    : props.defaultValue;
  const resetDefaultValue =
    props.resetDefaultValue &&
    (!isValidHexCode(props.resetDefaultValue)
      ? fallBackHex(props.resetDefaultValue, false)
      : props.resetDefaultValue);
  const [color, setColor] = useState(init);

  return (
    <Group className="w-full">
      <Popover>
        <PopoverTrigger render={<Button variant="outline" size="icon" aria-label="pick colors" />}>
          <span className="size-5 rounded-sm" style={{ backgroundColor: color }} />
        </PopoverTrigger>
        <PopoverPopup align={props.popoverAlign ?? "center"} sideOffset={10}>
          <HexColorPicker
            color={color}
            className="size-32!"
            onChange={(val) => {
              setColor(val);
              props.onChange(val);
            }}
          />
        </PopoverPopup>
      </Popover>

      <GroupSeparator />
      <span
        className="relative inline-flex w-full rounded-lg border border-input bg-background not-dark:bg-clip-padding text-base text-foreground shadow-xs/5 ring-ring/24 transition-shadow before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] not-has-disabled:not-has-focus-visible:not-has-aria-invalid:before:shadow-[0_1px_--theme(--color-black/4%)] has-focus-visible:has-aria-invalid:border-destructive/64 has-focus-visible:has-aria-invalid:ring-destructive/16 has-aria-invalid:border-destructive/36 has-focus-visible:border-ring has-autofill:bg-foreground/4 has-disabled:opacity-64 has-[:disabled,:focus-visible,[aria-invalid]]:shadow-none has-focus-visible:ring-[3px] sm:text-sm dark:bg-input/32 dark:has-autofill:bg-foreground/8 dark:has-aria-invalid:ring-destructive/24 dark:not-has-disabled:not-has-focus-visible:not-has-aria-invalid:before:shadow-[0_-1px_--theme(--color-white/6%)]"
        data-size="default"
        data-slot="input-control">
        <HexColorInput
          className="h-8.5 w-full min-w-0 rounded-[inherit] bg-transparent px-[calc(--spacing(3)-1px)] leading-8.5 outline-none [transition:background-color_5000000s_ease-in-out_0s] placeholder:text-muted-foreground/72 sm:h-7.5 sm:leading-7.5"
          color={color}
          onChange={(val) => {
            setColor(val);
            props.onChange(val);
          }}
          type="text"
        />
      </span>
      {resetDefaultValue && color !== resetDefaultValue && (
        <>
          <GroupSeparator />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Reset to default"
                  onClick={() => {
                    setColor(fallBackHex(resetDefaultValue, false));
                    props.onChange(resetDefaultValue);
                  }}>
                  <RotateCcwIcon aria-hidden="true" />
                </Button>
              }
            />
            <TooltipPopup>{props.useDefaultLabel ?? t("use_default")}</TooltipPopup>
          </Tooltip>
        </>
      )}
    </Group>
  );
};

export default ColorPicker;
