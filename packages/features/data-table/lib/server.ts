import type { FilterValue } from "./types";
import { isSelectFilterValue, isTextFilterValue } from "./utils";

export function makeWhereClause(columnName: string, filterValue: FilterValue) {
  if (isSelectFilterValue(filterValue)) {
    return {
      [columnName]: {
        in: filterValue,
      },
    };
  } else if (isTextFilterValue(filterValue)) {
    const { operator, operand } = filterValue.data;

    switch (operator) {
      case "equals":
        return {
          [columnName]: {
            equals: operand,
          },
        };
      case "notEquals":
        return {
          [columnName]: {
            not: operand,
          },
        };
      case "contains":
        return {
          [columnName]: {
            contains: operand,
            mode: "insensitive",
          },
        };
      case "notContains":
        return {
          NOT: {
            [columnName]: {
              contains: operand,
              mode: "insensitive",
            },
          },
        };
      case "startsWith":
        return {
          [columnName]: {
            startsWith: operand,
            mode: "insensitive",
          },
        };
      case "endsWith":
        return {
          [columnName]: {
            endsWith: operand,
            mode: "insensitive",
          },
        };
      case "isEmpty":
        return {
          [columnName]: {
            equals: "",
          },
        };
      case "isNotEmpty":
        return {
          NOT: {
            [columnName]: {
              equals: "",
            },
          },
        };
    }
  }
  return {};
}
