/**
 * Decouples the types from Prisma
 */
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export type JsonArray = JsonValue[];
export type JsonObject = { [Key in string]?: JsonValue };
