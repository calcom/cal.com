import { z } from "zod";
import tzdata from "tzdata";

import { ValidationError } from "./error";

export const commonSchemas = {
  id: z.string().uuid("Invalid ID format"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    orderBy: z.string().optional(),
    orderDir: z.enum(["asc", "desc"]).default("desc"),
  }),
};

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join(", ");

      throw new ValidationError(`Validation failed: ${errorMessage}`, {
        errors: error.errors,
      });
    }
    throw error;
  }
}

export function createValidationPreHandler<T>(schema: z.ZodSchema<T>) {
  return async (request: any, reply: any) => {
    try {
      request.validatedData = validateSchema(schema, {
        ...request.body,
        ...request.params,
        ...request.query,
      });
    } catch (error) {
      throw error;
    }
  };
}

// @note: This is a custom validation that checks if the timezone is valid and exists in the tzdb library
const tzValidator = (timezone: string) => Object.keys(tzdata.zones).includes(timezone);
const errorMsg = `Expected one of the following: ${Object.keys(tzdata.zones).join(", ")}`;

export const timeZone = z.string().refine(tzValidator, { message: errorMsg });