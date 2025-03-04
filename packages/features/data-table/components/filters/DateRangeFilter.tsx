import { format } from "date-fns";
import type { Dayjs } from "dayjs";
import { useState, useEffect, useCallback } from "react";

import dayjs from "@calcom/dayjs";
import {
  FUTURE_PRESET_VALUES,
  getDefaultFutureEndDate,
  getDefaultFutureStartDate,
} from "@calcom/features/data-table/lib/dateRange";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  DateRangePicker,
  Button,
  Icon,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandList,
  CommandItem,
  CommandGroup,
  CommandSeparator,
  buttonClasses,
} from "@calcom/ui";
import classNames from "@calcom/ui/classNames";

import { useDataTable, useFilterValue } from "../../hooks";
import {
  CUSTOM_PRESET,
  CUSTOM_PRESET_VALUE,
  DEFAULT_PRESET,
  PRESET_OPTIONS,
  getDefaultStartDate,
  getDefaultEndDate,
  type PresetOption,
  DEFAULT_PRESET_FUTURE,
} from "../../lib/dateRange";
import type { FilterableColumn, DateRangeFilterOptions } from "../../lib/types";
import { ZDateRangeFilterValue, ColumnFilterType } from "../../lib/types";

type DateRangeFilterProps = {
  column: Extract<FilterableColumn, { type: ColumnFilterType.DATE_RANGE }>;
  options?: DateRangeFilterOptions;
  showClearButton?: boolean;
};

const getDateRangeFromPreset = (val: string | null) => {
  let startDate;
  let endDate;
  const preset = PRESET_OPTIONS.find((o) => o.value === val);
  if (!preset) {
    return { startDate: getDefaultStartDate(), endDate: getDefaultEndDate(), preset: CUSTOM_PRESET };
  }

  switch (val) {
    case "tdy": // Today
      startDate = dayjs().startOf("day");
      endDate = dayjs().endOf("day");
      break;
    case "w": // Last 7 days
      startDate = dayjs().subtract(1, "week").startOf("day");
      endDate = dayjs().endOf("day");
      break;
    case "t": // Last 30 days
      startDate = dayjs().subtract(30, "day").startOf("day");
      endDate = dayjs().endOf("day");
      break;
    case "m": // Month to Date
      startDate = dayjs().startOf("month");
      endDate = dayjs().endOf("day");
      break;
    case "y": // Year to Date
      startDate = dayjs().startOf("year");
      endDate = dayjs().endOf("day");
      break;
    case "nw": // Next 7 days
      startDate = dayjs().startOf("day");
      endDate = dayjs().add(1, "week").endOf("day");
      break;
    case "nt": // Last 30 days
      startDate = dayjs().startOf("day");
      endDate = dayjs().add(30, "day").endOf("day");
      break;
    case "nm": // Date to Month
      startDate = dayjs().startOf("day");
      endDate = dayjs().endOf("month");
      break;
    case "ny": // Date to Year
      startDate = dayjs().startOf("day");
      endDate = dayjs().endOf("year");
      break;
    default:
      startDate = getDefaultStartDate();
      endDate = getDefaultEndDate();
      break;
  }

  return { startDate, endDate, preset };
};

export const DateRangeFilter = ({ column, options, showClearButton = false }: DateRangeFilterProps) => {
  const filterValue = useFilterValue(column.id, ZDateRangeFilterValue);
  const { updateFilter, removeFilter } = useDataTable();
  const range = options?.range ?? "past";
  const forceCustom = range === "custom";
  const forcePast = range === "past";
  const includeFuture = range === "future";

  const { t } = useLocale();
  const currentDate = dayjs();
  const [startDate, setStartDate] = useState<Dayjs | undefined>(
    filterValue?.data.startDate ? dayjs(filterValue.data.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Dayjs | undefined>(
    filterValue?.data.endDate ? dayjs(filterValue.data.endDate) : undefined
  );
  const DEFAULT = includeFuture ? DEFAULT_PRESET_FUTURE : DEFAULT_PRESET;
  const [selectedPreset, setSelectedPreset] = useState<PresetOption>(
    forceCustom
      ? CUSTOM_PRESET
      : filterValue?.data.preset
      ? PRESET_OPTIONS.find((o) => o.value === filterValue.data.preset) ?? DEFAULT
      : DEFAULT
  );

  const updateValues = useCallback(
    ({ preset, startDate, endDate }: { preset: PresetOption; startDate?: Dayjs; endDate?: Dayjs }) => {
      setSelectedPreset(preset);
      setStartDate(startDate);
      setEndDate(endDate);

      if (startDate && endDate) {
        updateFilter(column.id, {
          type: ColumnFilterType.DATE_RANGE,
          data: {
            startDate: startDate.toDate().toISOString(),
            endDate: endDate.toDate().toISOString(),
            preset: preset.value,
          },
        });
      }
    },
    [column.id]
  );

  useEffect(() => {
    // initially apply the default value
    // if the query param is not set yet
    if (!filterValue && !forceCustom) {
      updateValues({
        preset: includeFuture ? DEFAULT_PRESET_FUTURE : DEFAULT_PRESET,
        startDate: includeFuture ? getDefaultFutureStartDate() : getDefaultStartDate(),
        endDate: includeFuture ? getDefaultFutureEndDate() : getDefaultEndDate(),
      });
    }
  }, [filterValue, forceCustom, updateValues]);

  const updateDateRangeFromPreset = (val: string | null) => {
    if (val === CUSTOM_PRESET_VALUE) {
      updateValues({
        preset: CUSTOM_PRESET,
        startDate,
        endDate,
      });
    } else {
      const r = getDateRangeFromPreset(val);
      updateValues({
        preset: r.preset,
        startDate: r.startDate,
        endDate: r.endDate,
      });
    }
  };

  const updateDateRangeFromPicker = ({
    startDate,
    endDate,
  }: {
    startDate?: Date | undefined;
    endDate?: Date | undefined;
  }) => {
    updateValues({
      preset: CUSTOM_PRESET,
      startDate: startDate ? dayjs(startDate) : getDefaultStartDate(),
      endDate: endDate ? dayjs(endDate) : undefined,
    });
  };

  const isCustomPreset = selectedPreset.value === CUSTOM_PRESET_VALUE;

  let customButtonLabel = t("date_range");
  if (startDate && endDate) {
    customButtonLabel = `${format(startDate.toDate(), "LLL dd, y")} - ${format(
      endDate.toDate(),
      "LLL dd, y"
    )}`;
  } else if (startDate) {
    customButtonLabel = `${format(startDate.toDate(), "LLL dd, y")} - ?`;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          color="secondary"
          className="items-center capitalize"
          StartIcon="calendar-range"
          EndIcon="chevron-down"
          data-testid={`filter-popover-trigger-${column.id}`}>
          {!isCustomPreset && <span>{t(selectedPreset.labelKey, selectedPreset.i18nOptions)}</span>}
          {isCustomPreset && <span>{customButtonLabel}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-fit p-0" align="end">
        {isCustomPreset && (
          <div className="border-subtle border-r">
            <DateRangePicker
              dates={{
                startDate: startDate?.toDate(),
                endDate: endDate?.toDate(),
              }}
              data-testid="date-range-calendar"
              minDate={forcePast ? currentDate.subtract(2, "year").toDate() : null}
              maxDate={forcePast ? currentDate.toDate() : undefined}
              disabled={false}
              onDatesChange={updateDateRangeFromPicker}
              withoutPopover={true}
            />
            {forceCustom && (
              <div className="border-subtle border-t px-2 py-3">
                <Button
                  color="secondary"
                  className="w-full justify-center"
                  onClick={() => removeFilter(column.id)}>
                  {t("clear")}
                </Button>
              </div>
            )}
          </div>
        )}
        {!forceCustom && (
          <Command className={classNames("w-40", isCustomPreset && "rounded-b-none")}>
            <CommandList>
              {PRESET_OPTIONS.filter(
                (option) => includeFuture || !(FUTURE_PRESET_VALUES as string[]).includes(option.value)
              ).map((option) => (
                <CommandItem
                  key={option.value}
                  data-testid={`date-range-options-${option.value}`}
                  className={classNames(
                    "cursor-pointer justify-between px-3 py-2",
                    selectedPreset.value === option.value && "bg-emphasis"
                  )}
                  onSelect={() => {
                    updateDateRangeFromPreset(option.value);
                  }}>
                  <span className="capitalize">{t(option.labelKey, option.i18nOptions)}</span>
                  {selectedPreset.value === option.value && <Icon name="check" />}
                </CommandItem>
              ))}
            </CommandList>
            {showClearButton && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      removeFilter(column.id);
                    }}
                    className={classNames(
                      "w-full justify-center text-center",
                      buttonClasses({ color: "secondary" })
                    )}>
                    {t("clear")}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
};
