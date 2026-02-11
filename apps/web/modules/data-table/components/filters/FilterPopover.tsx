import startCase from "lodash/startCase";

import type { FilterType } from "@calcom/types/data-table";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import type { IconName } from "@calcom/ui/components/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@calcom/ui/components/popover";

import { useFilterValue } from "@calcom/features/data-table/hooks";
import {
  type FilterableColumn,
  type FilterValue,
  ZFilterValue,
  ColumnFilterType,
} from "@calcom/features/data-table/lib/types";
import {
  isSingleSelectFilterValue,
  isMultiSelectFilterValue,
  isTextFilterValue,
  isNumberFilterValue,
} from "@calcom/features/data-table/lib/utils";
import { FilterOptions } from "./FilterOptions";
import { useFilterPopoverOpen } from "./useFilterPopoverOpen";
import { numberFilterOperatorOptions, useTextFilterOperatorOptions } from "./utils";

const FILTER_ICONS: Record<FilterType, IconName> = {
  [ColumnFilterType.TEXT]: "file-text",
  [ColumnFilterType.NUMBER]: "binary",
  [ColumnFilterType.MULTI_SELECT]: "layers",
  [ColumnFilterType.SINGLE_SELECT]: "disc",
  [ColumnFilterType.DATE_RANGE]: "calendar-range",
};

type FilterPopoverProps = {
  column: FilterableColumn;
};

type SelectedLabelsProps = {
  column: FilterableColumn;
  filterValue?: FilterValue;
};

function Operator({ children }: { children: React.ReactNode }) {
  return <span className="ml-2 text-sm lowercase opacity-75">{children}</span>;
}

function AppliedTextFilterValue({ filterValue }: SelectedLabelsProps) {
  const textFilterOperatorOptions = useTextFilterOperatorOptions();
  if (!isTextFilterValue(filterValue)) return null;

  const operator = filterValue.data.operator;
  const operatorOption = textFilterOperatorOptions.find((o) => o.value === operator);
  if (!operatorOption) return null;

  if (!operatorOption.requiresOperand) {
    return <Operator>{operatorOption.label}</Operator>;
  }

  const operand = filterValue.data.operand;
  return (
    <>
      <Operator>{operatorOption.label}</Operator>
      <Badge variant="gray" className="ml-2">
        {operand}
      </Badge>
    </>
  );
}

function AppliedNumberFilterValue({ filterValue }: SelectedLabelsProps) {
  if (!isNumberFilterValue(filterValue)) return null;

  const operator = filterValue.data.operator;
  const operatorOption = numberFilterOperatorOptions.find((o) => o.value === operator);
  if (!operatorOption) return null;

  return (
    <>
      <Operator>{operatorOption.label}</Operator>
      <Badge variant="gray" className="ml-2">
        {filterValue.data.operand}
      </Badge>
    </>
  );
}

function AppliedSelectFilterValue({ column, filterValue }: SelectedLabelsProps) {
  let text: string | undefined;
  let moreCount = 0;

  if (isSingleSelectFilterValue(filterValue)) {
    const options = (column as FilterableColumn & { type: "ss" }).options;
    text = options.find((opt) => opt.value === filterValue.data)?.label;
    moreCount = 0;
  } else if (isMultiSelectFilterValue(filterValue)) {
    const options = (column as FilterableColumn & { type: "ms" }).options;
    text = options.find((opt) => opt.value === filterValue.data[0])?.label;
    moreCount = filterValue.data.length - 1;
  }

  if (!text) return null;

  return (
    <>
      <Badge variant="gray" className="ml-2">
        {text}
      </Badge>
      {moreCount > 0 && (
        <Badge variant="gray" className="ml-2">
          +{moreCount}
        </Badge>
      )}
    </>
  );
}

function AppliedFilterValue({
  column,
  filterValue,
}: {
  column: FilterableColumn;
  filterValue?: FilterValue;
}) {
  if (column.type === ColumnFilterType.TEXT) {
    return <AppliedTextFilterValue column={column} filterValue={filterValue} />;
  } else if (column.type === ColumnFilterType.NUMBER) {
    return <AppliedNumberFilterValue column={column} filterValue={filterValue} />;
  } else if (
    column.type === ColumnFilterType.SINGLE_SELECT ||
    column.type === ColumnFilterType.MULTI_SELECT
  ) {
    return <AppliedSelectFilterValue column={column} filterValue={filterValue} />;
  } else {
    return null;
  }
}

export function FilterPopover({ column }: FilterPopoverProps) {
  const icon = column.icon || FILTER_ICONS[column.type];
  const filterValue = useFilterValue(column.id, ZFilterValue);
  const { open, onOpenChange } = useFilterPopoverOpen(column.id);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          color="secondary"
          className="h-[34px] items-center"
          StartIcon={icon}
          EndIcon="chevron-down"
          data-testid={`filter-popover-trigger-${column.id}`}>
          <span>{startCase(column.title)}</span>
          <AppliedFilterValue column={column} filterValue={filterValue} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <FilterOptions column={column} />
      </PopoverContent>
    </Popover>
  );
}
