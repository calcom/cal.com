import type { NextRequest } from "next/server";

export type HeaderRecord = Record<string, string | string[] | undefined>;

export const toHeaderRecord = (request: NextRequest): HeaderRecord => {
  const headers: HeaderRecord = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  return headers;
};

export const getHeaderValue = (headers: HeaderRecord, key: string): string | undefined => {
  const value = headers[key.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};
