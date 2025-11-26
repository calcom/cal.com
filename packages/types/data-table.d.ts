import type { IconName } from "@calcom/ui/components/icon/icon-names";

export type FilterTypeSingleSelect = "ss";
export type FilterTypeMultiSelect = "ms";
export type FilterTypeText = "t";
export type FilterTypeNumber = "n";
export type FilterTypeDateRange = "dr";

export type TextFilterOperator = "equals" | "notEquals" | "contains" | "notContains" | "startsWith" | "endsWith" | "isEmpty" | "isNotEmpty";

export type TextFilterOptions = {
  allowedOperators?: TextFilterOperator[];
  placeholder?: string;
};

export type DateRangeFilterOptions = {
  range?: "past" | "custom";
  convertToTimeZone?: boolean;
};

export type ColumnFilterMeta =
  | {
      type: FilterTypeDateRange;
      icon?: IconName;
      dateRangeOptions?: DateRangeFilterOptions;
    }
  | {
      type: FilterTypeText;
      icon?: IconName;
      textOptions?: TextFilterOptions;
    }
  | {
      type?: FilterTypeMultiSelect | FilterTypeNumber | FilterTypeSingleSelect;
      icon?: IconName;
    };

export type FilterableColumn = {
    id: string;
    title: string;
    icon?: IconName;
} & (
    | {
        type: FilterTypeSingleSelect;
        options: FacetedValue[];
    }
    | {
        type: FilterTypeMultiSelect;
        options: FacetedValue[];
    }
    | {
        type: FilterTypeText;
        textOptions?: TextFilterOptions;
    }
    | {
        type: FilterTypeNumber;
    }
    | {
        type: FilterTypeDateRange;
        dateRangeOptions?: DateRangeFilterOptions;
    }
);