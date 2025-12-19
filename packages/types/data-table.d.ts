import type { LucideIcon } from "lucide-react";

export type FilterType = "ss" | "ms" | "t" | "n" | "dr";

export type TextFilterOperator = "equals" | "notEquals" | "contains" | "notContains" | "startsWith" | "endsWith" | "isEmpty" | "isNotEmpty";

export type TextFilterOptions = {
  allowedOperators?: TextFilterOperator[];
  placeholder?: string;
};

export type DateRangeFilterOptions = {
  range?: "past" | "future" | "any" | "customOnly";
  convertToTimeZone?: boolean;
};

export type ColumnFilterMeta =
  | {
      type: Extract<FilterType, "dr">;
      icon?: LucideIcon;
      dateRangeOptions?: DateRangeFilterOptions;
    }
  | {
      type: Extract<FilterType, "t">;
      icon?: LucideIcon;
      textOptions?: TextFilterOptions;
    }
  | {
      type?: Extract<FilterType, "ms" | "n" | "ss">;
      icon?: LucideIcon;
    };

export type FilterableColumn = {
    id: string;
    title: string;
    icon?: LucideIcon;
} & (
    | {
        type: Extract<FilterType, "ss">;
        options: FacetedValue[];
    }
    | {
        type: Extract<FilterType, "ms">;
        options: FacetedValue[];
    }
    | {
        type: Extract<FilterType, "t">;
        textOptions?: TextFilterOptions;
    }
    | {
        type: Extract<FilterType, "n">;
    }
    | {
        type: Extract<FilterType, "dr">;
        dateRangeOptions?: DateRangeFilterOptions;
    }
);
