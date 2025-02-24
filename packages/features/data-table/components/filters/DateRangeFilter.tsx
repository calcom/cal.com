import { format } from "date-fns";
import type { Dayjs } from "dayjs";
import { useState } from "react";

import dayjs from "@calcom/dayjs";
import { classNames } from "@calcom/lib";
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
} from "@calcom/ui";

import { useDataTable, useFilterValue } from "../../hooks";
import {
  CUSTOM_PRESET,
  CUSTOM_PRESET_VALUE,
  DEFAULT_PRESET,
  PRESET_OPTIONS,
  getDefaultStartDate,
  getDefaultEndDate,
  type PresetOption,
} from "../../lib/dateRange";
import type { FilterableColumn } from "../../lib/types";
import { ZDateRangeFilterValue, ColumnFilterType } from "../../lib/types";

type DateRangeFilterProps = {
  column: Extract<FilterableColumn, { type: ColumnFilterType.DATE_RANGE }>;
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
    default:
      startDate = getDefaultStartDate();
      endDate = getDefaultEndDate();
      break;
  }

  return { startDate, endDate, preset };
};

export const DateRangeFilter = ({ column }: DateRangeFilterProps) => {
  const filterValue = useFilterValue(column.id, ZDateRangeFilterValue);
  const { updateFilter } = useDataTable();

  const { t } = useLocale();
  const currentDate = dayjs();
  const [startDate, setStartDate] = useState<Dayjs>(
    filterValue?.data.startDate ? dayjs(filterValue.data.startDate) : getDefaultStartDate()
  );
  const [endDate, setEndDate] = useState<Dayjs | undefined>(
    filterValue?.data.endDate ? dayjs(filterValue.data.endDate) : getDefaultEndDate()
  );
  const [selectedPreset, setSelectedPreset] = useState<PresetOption>(DEFAULT_PRESET);

  const updateValues = ({
    preset,
    startDate,
    endDate,
  }: {
    preset: PresetOption;
    startDate: Dayjs;
    endDate?: Dayjs;
  }) => {
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
  };

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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button color="secondary" className="items-center capitalize" EndIcon="chevron-down">
          {!isCustomPreset && <span>{t(selectedPreset.labelKey, selectedPreset.i18nOptions)}</span>}
          {isCustomPreset &&
            (endDate ? (
              <span>
                {format(startDate.toDate(), "LLL dd, y")} - {format(endDate.toDate(), "LLL dd, y")}
              </span>
            ) : (
              <span>{format(startDate.toDate(), "LLL dd, y")} - End</span>
            ))}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-fit p-0" align="end">
        {isCustomPreset && (
          <div className="border-subtle border-r">
            <DateRangePicker
              dates={{
                startDate: startDate.toDate(),
                endDate: endDate?.toDate(),
              }}
              minDate={currentDate.subtract(2, "year").toDate()}
              maxDate={currentDate.toDate()}
              disabled={false}
              onDatesChange={updateDateRangeFromPicker}
              withoutPopover={true}
            />
          </div>
        )}
        <Command className={classNames("w-40", isCustomPreset && "rounded-b-none")}>
          <CommandList>
            {PRESET_OPTIONS.map((option) => (
              <CommandItem
                key={option.value}
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
        </Command>
      </PopoverContent>
    </Popover>
  );
};
