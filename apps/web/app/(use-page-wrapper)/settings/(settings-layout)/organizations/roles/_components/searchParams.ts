import { createSearchParamsCache, parseAsBoolean, parseAsString } from "nuqs/server";

export const roleParsers = {
  // Sheet visibility state
  "role-sheet": parseAsBoolean.withDefault(false),
  // Selected role ID for editing
  role: parseAsString.withDefault(""),
};

export const roleSearchParamsCache = createSearchParamsCache(roleParsers);
