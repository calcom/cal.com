"use client";

import type {
  SingleSelectFilterValue,
  MultiSelectFilterValue,
  TextFilterValue,
  FilterValue,
  NumberFilterValue,
} from "./types";
import {
  ZNumberFilterValue,
  ZSingleSelectFilterValue,
  ZMultiSelectFilterValue,
  ZTextFilterValue,
} from "./types";

export const textFilter = (cellValue: unknown, filterValue: TextFilterValue) => {
  if (filterValue.data.operator === "isEmpty" && !cellValue) {
    return true;
  }

  if (typeof cellValue !== "string") {
    return false;
  }

  switch (filterValue.data.operator) {
    case "equals":
      return cellValue.toLowerCase() === (filterValue.data.operand || "").toLowerCase();
    case "notEquals":
      return cellValue.toLowerCase() !== (filterValue.data.operand || "").toLowerCase();
    case "contains":
      return cellValue.toLowerCase().includes((filterValue.data.operand || "").toLowerCase());
    case "notContains":
      return !cellValue.toLowerCase().includes((filterValue.data.operand || "").toLowerCase());
    case "startsWith":
      return cellValue.toLowerCase().startsWith((filterValue.data.operand || "").toLowerCase());
    case "endsWith":
      return cellValue.toLowerCase().endsWith((filterValue.data.operand || "").toLowerCase());
    case "isEmpty":
      return cellValue.trim() === "";
    case "isNotEmpty":
      return cellValue.trim() !== "";
    default:
      return false;
  }
};

export const isTextFilterValue = (filterValue: unknown): filterValue is TextFilterValue => {
  return ZTextFilterValue.safeParse(filterValue).success;
};

const isAllString = (array: (string | number)[]): array is string[] => {
  return array.every((value) => typeof value === "string");
};

const isAllNumber = (array: (string | number)[]): array is number[] => {
  return array.every((value) => typeof value === "number");
};

export const multiSelectFilter = (cellValue: unknown | undefined, filterValue: MultiSelectFilterValue) => {
  const cellValueArray = Array.isArray(cellValue) ? cellValue : [cellValue];

  const filterValueArray = filterValue.data;
  if (!filterValueArray || filterValueArray.length === 0) {
    return true;
  }

  if (isAllString(filterValueArray) && isAllString(cellValueArray)) {
    return cellValueArray.some((v) => filterValueArray.includes(v));
  } else if (isAllNumber(filterValueArray) && isAllNumber(cellValueArray)) {
    return cellValueArray.some((v) => filterValueArray.includes(v));
  }

  return false;
};

export const isMultiSelectFilterValue = (filterValue: unknown): filterValue is MultiSelectFilterValue => {
  return ZMultiSelectFilterValue.safeParse(filterValue).success;
};

export const singleSelectFilter = (cellValue: unknown | undefined, filterValue: SingleSelectFilterValue) => {
  return filterValue.data === cellValue;
};

export const isSingleSelectFilterValue = (filterValue: unknown): filterValue is SingleSelectFilterValue => {
  return ZSingleSelectFilterValue.safeParse(filterValue).success;
};

export const numberFilter = (cellValue: unknown, filterValue: NumberFilterValue) => {
  if (typeof cellValue !== "number") {
    return false;
  }

  switch (filterValue.data.operator) {
    case "eq":
      return cellValue === filterValue.data.operand;
    case "neq":
      return cellValue !== filterValue.data.operand;
    case "gt":
      return cellValue > filterValue.data.operand;
    case "gte":
      return cellValue >= filterValue.data.operand;
    case "lt":
      return cellValue < filterValue.data.operand;
    case "lte":
      return cellValue <= filterValue.data.operand;
  }

  return false;
};

export const isNumberFilterValue = (filterValue: unknown): filterValue is NumberFilterValue => {
  return ZNumberFilterValue.safeParse(filterValue).success;
};

export const dataTableFilter = (cellValue: unknown, filterValue: FilterValue) => {
  if (isSingleSelectFilterValue(filterValue)) {
    return singleSelectFilter(cellValue, filterValue);
  } else if (isMultiSelectFilterValue(filterValue)) {
    return multiSelectFilter(cellValue, filterValue);
  } else if (isTextFilterValue(filterValue)) {
    return textFilter(cellValue, filterValue);
  } else if (isNumberFilterValue(filterValue)) {
    return numberFilter(cellValue, filterValue);
  }
  return false;
};
