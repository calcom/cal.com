// eslint-disable-next-line no-restricted-imports
import startCase from "lodash/startCase";

import type { IconName } from "@calcom/ui";
import { Button, Popover, PopoverContent, PopoverTrigger, Badge } from "@calcom/ui";

import { useFilterValue } from "../../hooks";
import { type FilterableColumn, type FilterValue, ZFilterValue, ColumnFilterType } from "../../lib/types";
import {
  isSingleSelectFilterValue,
  isMultiSelectFilterValue,
  isTextFilterValue,
  isNumberFilterValue,
} from "../../lib/utils";
import { FilterOptions } from "./FilterOptions";
import { numberFilterOperatorOptions, useTextFilterOperatorOptions } from "./utils";

const FILTER_ICONS: Record<ColumnFilterType, IconName> = {
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
    const options = (column as Extract<FilterableColumn, { type: ColumnFilterType.SINGLE_SELECT }>).options;
    text = options.find((opt) => opt.value === filterValue.data)?.label;
    moreCount = 0;
  } else if (isMultiSelectFilterValue(filterValue)) {
    const options = (column as Extract<FilterableColumn, { type: ColumnFilterType.MULTI_SELECT }>).options;
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          color="secondary"
          className="items-center"
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
