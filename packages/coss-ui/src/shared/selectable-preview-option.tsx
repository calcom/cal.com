"use client";

import type { ReactNode } from "react";

import { FieldLabel } from "@coss/ui/components/field";
import { cn } from "@coss/ui/lib/utils";

type SelectablePreviewOptionProps = {
  control: ReactNode;
  preview: ReactNode;
  label: ReactNode;
  labelClassName?: string;
};

const fieldLabelClasses =
  "grid w-full cursor-pointer grid-cols-[auto_1fr] grid-rows-[auto_auto] gap-x-4 sm:gap-x-2 gap-y-3 max-sm:grid-cols-[5rem_1fr] max-sm:grid-rows-1 max-sm:items-center max-sm:gap-y-0";

const previewContainerClasses =
  "relative col-span-2 row-start-1 block aspect-208/120 w-full min-w-0 overflow-hidden rounded-sm sm:rounded-lg not-peer-data-checked:opacity-80 shadow-xs transition-[box-shadow,opacity] peer-data-disabled:cursor-not-allowed peer-data-disabled:opacity-64 peer-data-checked:ring-2 peer-data-checked:ring-primary peer-data-checked:ring-offset-1 peer-data-checked:ring-offset-background max-sm:col-span-1";

const labelClasses =
  "col-start-2 row-start-2 self-center not-peer-data-checked:text-muted-foreground/72 max-sm:col-start-2 max-sm:row-start-1 max-sm:justify-self-start max-sm:text-left";

export function SelectablePreviewOption({
  control,
  preview,
  label,
  labelClassName,
}: SelectablePreviewOptionProps) {
  return (
    <FieldLabel className={fieldLabelClasses}>
      {control}
      <span className={previewContainerClasses}>{preview}</span>
      <span className={cn(labelClasses, labelClassName)}>{label}</span>
    </FieldLabel>
  );
}
