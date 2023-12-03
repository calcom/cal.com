import { other } from "../params/enums";

export const isNull = (value: any): boolean => {
  return value === null || value === undefined || value === other;
};

export const isNotNull = (value: any): boolean => {
  return value !== null && value !== undefined && value !== other;
};
