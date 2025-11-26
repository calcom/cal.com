import type { IconName } from "@calcom/ui/components/icon/icon-names";

export enum ColumnFilterType {
  SINGLE_SELECT = "ss",
  MULTI_SELECT = "ms",
  TEXT = "t",
  NUMBER = "n",
  DATE_RANGE = "dr",
}

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
      type: ColumnFilterType.DATE_RANGE;
      icon?: IconName;
      dateRangeOptions?: DateRangeFilterOptions;
    }
  | {
      type: ColumnFilterType.TEXT;
      icon?: IconName;
      textOptions?: TextFilterOptions;
    }
  | {
      type?: Exclude<ColumnFilterType, ColumnFilterType.DATE_RANGE | ColumnFilterType.TEXT>;
      icon?: IconName;
    };

export type FilterableColumn = {
    id: string;
    title: string;
    icon?: IconName;
} & (
    | {
        type: ColumnFilterType.SINGLE_SELECT;
        options: FacetedValue[];
    }
    | {
        type: ColumnFilterType.MULTI_SELECT;
        options: FacetedValue[];
    }
    | {
        type: ColumnFilterType.TEXT;
        textOptions?: TextFilterOptions;
    }
    | {
        type: ColumnFilterType.NUMBER;
    }
    | {
        type: ColumnFilterType.DATE_RANGE;
        dateRangeOptions?: DateRangeFilterOptions;
    }
);