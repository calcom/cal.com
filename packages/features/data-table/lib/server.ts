import type { FilterValue } from "./types";
import { isSelectFilterValue, isTextFilterValue } from "./utils";

type makeWhereClauseProps = {
  columnName: string;
  filterValue: FilterValue;
  json?: true | { path: string[] };
};

export function makeWhereClause(props: makeWhereClauseProps) {
  const { columnName, filterValue } = props;
  const isJson = props.json === true || (typeof props.json === "object" && props.json.path?.length > 0);
  const jsonPath = isJson && typeof props.json === "object" ? props.json.path : undefined;

  const jsonPathObj = isJson && jsonPath ? { path: jsonPath } : {};
  if (isSelectFilterValue(filterValue)) {
    return {
      [columnName]: {
        ...jsonPathObj,
        ...(isJson ? { array_contains: filterValue } : { in: filterValue }),
      },
    };
  } else if (isTextFilterValue(filterValue)) {
    const { operator, operand } = filterValue.data;
    switch (operator) {
      case "equals":
        return {
          [columnName]: {
            ...jsonPathObj,
            equals: operand,
          },
        };
      case "notEquals":
        return {
          [columnName]: {
            ...jsonPathObj,
            not: operand,
          },
        };
      case "contains":
        return {
          [columnName]: {
            ...jsonPathObj,
            ...(isJson ? { string_contains: operand } : { contains: operand, mode: "insensitive" }),
          },
        };
      case "notContains":
        return {
          NOT: {
            [columnName]: {
              ...jsonPathObj,
              ...(isJson ? { string_contains: operand } : { contains: operand, mode: "insensitive" }),
            },
          },
        };
      case "startsWith":
        return {
          [columnName]: {
            ...jsonPathObj,
            ...(isJson ? { string_starts_with: operand } : { startsWith: operand, mode: "insensitive" }),
          },
        };
      case "endsWith":
        return {
          [columnName]: {
            ...jsonPathObj,
            ...(isJson ? { string_ends_with: operand } : { endsWith: operand, mode: "insensitive" }),
          },
        };
      case "isEmpty":
        return {
          [columnName]: {
            ...jsonPathObj,
            equals: "",
          },
        };
      case "isNotEmpty":
        return {
          NOT: {
            [columnName]: {
              ...jsonPathObj,
              equals: "",
            },
          },
        };
    }
  }
  return {};
}
