import { Prisma } from "@calcom/prisma/client";
import type { FilterValue, SortingState } from "./types";
import {
  isDateRangeFilterValue,
  isMultiSelectFilterValue,
  isNumberFilterValue,
  isSingleSelectFilterValue,
  isTextFilterValue,
} from "./utils";

type MakeWhereClauseProps = {
  columnName: string;
  filterValue: FilterValue;
  json?: true | { path: string[] };
};

export function makeOrderBy(sorting: SortingState) {
  if (!sorting || !sorting.length) return undefined;

  return sorting.map((sort) => ({
    [sort.id]: sort.desc ? ("desc" as const) : ("asc" as const),
  }));
}

/**
 * Builds a Prisma where clause for use with Prisma queries
 */
export function makeWhereClause(props: MakeWhereClauseProps) {
  const { columnName, filterValue } = props;
  const isJson = props.json === true || (typeof props.json === "object" && props.json.path?.length > 0);
  const jsonPath = isJson && typeof props.json === "object" ? props.json.path : undefined;

  const jsonPathObj = isJson && jsonPath ? { path: jsonPath } : {};
  if (isMultiSelectFilterValue(filterValue)) {
    return {
      [columnName]: {
        ...jsonPathObj,
        ...(isJson ? { array_contains: filterValue.data } : { in: filterValue.data }),
      },
    };
  } else if (isSingleSelectFilterValue(filterValue)) {
    return {
      [columnName]: {
        ...jsonPathObj,
        equals: filterValue.data,
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
      default:
        throw new Error(`Invalid operator for text filter: ${operator}`);
    }
  } else if (isNumberFilterValue(filterValue)) {
    const { operator, operand } = filterValue.data;
    switch (operator) {
      case "eq":
        return {
          [columnName]: {
            ...jsonPathObj,
            equals: operand,
          },
        };
      case "neq":
        return {
          [columnName]: {
            ...jsonPathObj,
            not: operand,
          },
        };
      case "gt":
        return {
          [columnName]: {
            ...jsonPathObj,
            gt: operand,
          },
        };
      case "gte":
        return {
          [columnName]: {
            ...jsonPathObj,
            gte: operand,
          },
        };
      case "lt":
        return {
          [columnName]: {
            ...jsonPathObj,
            lt: operand,
          },
        };
      case "lte":
        return {
          [columnName]: {
            ...jsonPathObj,
            lte: operand,
          },
        };
      default:
        throw new Error(`Invalid operator for number filter: ${operator}`);
    }
  } else if (isDateRangeFilterValue(filterValue)) {
    const { startDate, endDate } = filterValue.data;
    if (!startDate || !endDate) {
      throw new Error(`Invalid date range filter: ${JSON.stringify({ columnName, startDate, endDate })}`);
    }

    return {
      [columnName]: {
        ...jsonPathObj,
        gte: startDate,
        lte: endDate,
      },
    };
  }
  throw new Error(`Invalid filter type: ${JSON.stringify({ columnName, filterValue })}`);
}

/**
 * Builds a SQL where clause for use with raw SQL queries
 */
export function makeSqlCondition(filterValue: FilterValue): Prisma.Sql | null {
  if (isMultiSelectFilterValue(filterValue)) {
    return Prisma.sql`= ANY(${filterValue.data})`;
  } else if (isSingleSelectFilterValue(filterValue)) {
    return Prisma.sql`= ${filterValue.data}`;
  } else if (isTextFilterValue(filterValue)) {
    const { operator, operand } = filterValue.data;
    switch (operator) {
      case "equals":
        return Prisma.sql`= ${operand}`;
      case "notEquals":
        return Prisma.sql`!= ${operand}`;
      case "contains":
        return Prisma.sql`ILIKE ${`%${operand}%`}`;
      case "notContains":
        return Prisma.sql`NOT ILIKE ${`%${operand}%`}`;
      case "startsWith":
        return Prisma.sql`ILIKE ${`${operand}%`}`;
      case "endsWith":
        return Prisma.sql`ILIKE ${`%${operand}`}`;
      case "isEmpty":
        return Prisma.sql`= ''`;
      case "isNotEmpty":
        return Prisma.sql`!= ''`;
      default:
        return null;
    }
  } else if (isNumberFilterValue(filterValue)) {
    const { operator, operand } = filterValue.data;
    switch (operator) {
      case "eq":
        return Prisma.sql`= ${operand}`;
      case "neq":
        return Prisma.sql`!= ${operand}`;
      case "gt":
        return Prisma.sql`> ${operand}`;
      case "gte":
        return Prisma.sql`>= ${operand}`;
      case "lt":
        return Prisma.sql`< ${operand}`;
      case "lte":
        return Prisma.sql`<= ${operand}`;
      default:
        return null;
    }
  }

  return null;
}
