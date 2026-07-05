// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type ValidationSchemaPropType = string | Function;

export type ValidationSchema = {
  required?: boolean;
  props?: Record<
    string,
    ValidationSchema & {
      type: ValidationSchemaPropType | ValidationSchemaPropType[];
    }
  >;
};

/**
 * A very simple data validator written with intention of keeping payload size low.
 * Extend the functionality of it as required by the embed.
 *
 * Special types supported:
 * - "calLink": Validates that the value is a string that does NOT start with `/` or `http(s)://`
 *   (case-insensitive), preventing full URLs or absolute paths from being passed as cal links.
 */
export function validate(data: Record<string, unknown>, schema: ValidationSchema): void {
  function checkType(value: unknown, expectedType: ValidationSchemaPropType): boolean {
    if (expectedType === "calLink") {
      // Validate: must be a string and must NOT start with / or http(s):// (case-insensitive)
      return typeof value === "string" && !/^(?:\/|https?:\/\/)/i.test(value);
    }
    if (typeof expectedType === "string") {
      return typeof value === expectedType;
    } else {
      return value instanceof expectedType;
    }
  }

  function isUndefined(val: unknown): val is undefined {
    return typeof val === "undefined";
  }

  if (schema.required && isUndefined(data)) {
    throw new Error("Argument is required");
  }

  for (const [prop, propSchema] of Object.entries(schema.props || {})) {
    if (propSchema.required && isUndefined(data[prop])) {
      throw new Error(`"${prop}" is required`);
    }
    let typeCheck = true;
    if (propSchema.type && !isUndefined(data[prop])) {
      if (propSchema.type instanceof Array) {
        propSchema.type.forEach((type) => {
          typeCheck = typeCheck || checkType(data[prop], type);
        });
      } else {
        typeCheck = checkType(data[prop], propSchema.type);
      }
    }
    if (!typeCheck) {
      throw new Error(`"${prop}" is of wrong type.Expected type "${propSchema.type}"`);
    }
  }
}
