// src/prisma-types.ts

// These types are derived from Prisma's internal types
// to ensure type safety without importing the full client.
export type JsonValue = string | number | boolean | JsonObject | JsonArray | null;

export type JsonObject = { [key: string]: JsonValue };

export type JsonArray = Array<JsonValue>;
