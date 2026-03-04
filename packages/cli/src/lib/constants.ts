export const API_VERSION = {
  V_2024_06_11: "2024-06-11",
  V_2024_06_14: "2024-06-14",
  V_2024_08_13: "2024-08-13",
  V_2024_09_04: "2024-09-04",
} as const;

export type ApiVersionValue = (typeof API_VERSION)[keyof typeof API_VERSION];
