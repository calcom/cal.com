// eslint-disable-next-line no-restricted-imports
import startCase from "lodash/startCase";

import type { IconName } from "@calcom/ui";
import { Button, Icon, Popover, PopoverContent, PopoverTrigger } from "@calcom/ui";

import { useFilterValue } from "../../hooks";
import { type FilterableColumn, type FilterValue, ZFilterValue } from "../../lib/types";
import {
  isSingleSelectFilterValue,
  isMultiSelectFilterValue,
  isTextFilterValue,
  isNumberFilterValue,
} from "../../lib/utils";
import { FilterOptions } from "./FilterOptions";

const FILTER_ICONS: Record<FilterableColumn["type"], IconName> = {
  text: "file-text",
  number: "binary",
  multi_select: "layers",
  single_select: "disc",
  date_range: "calendar-range",
};

type FilterPopoverProps = {
  column: FilterableColumn;
};

const useSelectedLabels = ({
  column,
  filterValue,
}: {
  column: FilterableColumn;
  filterValue?: FilterValue;
}) => {
  if (isTextFilterValue(filterValue)) {
    return { text: filterValue.data.operand, moreCount: 0 };
  } else if (isNumberFilterValue(filterValue)) {
    return { text: filterValue.data.operand, moreCount: 0 };
  } else if (isSingleSelectFilterValue(filterValue)) {
    const options = (column as Extract<FilterableColumn, { type: "single_select" }>).options;
    const text = options.find((opt) => opt.value === filterValue.data)?.label;
    return { text, moreCount: 0 };
  } else if (isMultiSelectFilterValue(filterValue)) {
    const options = (column as Extract<FilterableColumn, { type: "multi_select" }>).options;
    const text = options.find((opt) => opt.value === filterValue.data[0])?.label;
    return { text, moreCount: filterValue.data.length - 1 };
  } else {
    return { text: "", moreCount: 0 };
  }
};

export function FilterPopover({ column }: FilterPopoverProps) {
  const icon = column.icon || FILTER_ICONS[column.type];
  const filterValue = useFilterValue(column.id, ZFilterValue);
  const { text, moreCount } = useSelectedLabels({ column, filterValue });
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button color="secondary" className="items-center">
          <Icon name={icon} className="mr-2 h-4 w-4" />
          <span>{startCase(column.title)}</span>
          {text && <span className="bg-subtle ml-2 rounded-md px-2">{text}</span>}
          {moreCount > 0 && <span className="bg-subtle ml-2 rounded-md px-2">+{moreCount}</span>}
          <Icon name="chevron-down" className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <FilterOptions column={column} />
      </PopoverContent>
    </Popover>
  );
}
