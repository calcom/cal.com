export declare type JsonObject = {
  [Key in string]?: JsonValue;
};
export type JsonArray = Array<JsonValue>;
export type JsonValue = string | number | boolean | JsonObject | JsonArray | null;
