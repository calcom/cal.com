"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@coss/ui/components/button";
import { Calendar } from "@coss/ui/components/calendar";
import { Popover, PopoverPopup, PopoverTrigger } from "@coss/ui/components/popover";
import { SelectButton } from "@coss/ui/components/select";

export interface InvoicePreset {
  label: ReactNode;
  value: string;
  onClick: () => void;
}

export type DateRangeValue = DateRange;

interface DateRangeFilterProps {
  invoiceRangeLabel: ReactNode;
  invoicePresets: InvoicePreset[];
  selectedInvoicePreset: string | null;
  invoiceMonth: Date;
  setInvoiceMonth: (month: Date) => void;
  invoiceRange: DateRange | undefined;
  setInvoiceRange: (range: DateRange | undefined) => void;
  setSelectedInvoicePreset: (preset: string | null) => void;
}

export function DateRangeFilter({
  invoiceRangeLabel,
  invoicePresets,
  selectedInvoicePreset,
  invoiceMonth,
  setInvoiceMonth,
  invoiceRange,
  setInvoiceRange,
  setSelectedInvoicePreset,
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<SelectButton className="w-fit" />}>{invoiceRangeLabel}</PopoverTrigger>
      <PopoverPopup align="end" className="p-0">
        <div className="flex max-sm:flex-col">
          <div className="relative max-sm:order-1 max-sm:border-t max-sm:pt-2 sm:py-1">
            <div className="flex h-full flex-col gap-0.5 sm:min-w-36 sm:border-e sm:pe-2">
              {invoicePresets.map((preset) => (
                <Button
                  className="justify-start"
                  data-pressed={selectedInvoicePreset === preset.value ? "" : undefined}
                  key={typeof preset.label === "string" ? preset.label : preset.value}
                  onClick={() => {
                    preset.onClick();
                    setOpen(false);
                  }}
                  variant="ghost">
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          <Calendar
            className="max-sm:pb-2 sm:ps-2"
            mode="range"
            month={invoiceMonth}
            numberOfMonths={1}
            onMonthChange={setInvoiceMonth}
            onSelect={(range) => {
              setInvoiceRange(range);
              setSelectedInvoicePreset(null);
            }}
            selected={invoiceRange}
          />
        </div>
      </PopoverPopup>
    </Popover>
  );
}
