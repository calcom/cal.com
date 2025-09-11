// apps/connector/src/schemas/response.ts
import { z } from "zod";

// Base error schema
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
});

// Base pagination schema
export const paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

// Base meta schema that can include pagination and other metadata
export const metaSchema = z
  .object({
    pagination: paginationSchema.optional(),
  })
  .catchall(z.any()); // Allow additional meta fields

// Generic base response schema factory
export const createApiResponseSchema = <TData extends z.ZodTypeAny>(dataSchema?: TData) => {
  return z.object({
    success: z.boolean(),
    data: dataSchema ? dataSchema : z.any().optional(),
    message: z.string().optional(),
    error: apiErrorSchema.optional(),
    meta: metaSchema.optional(),
  });
};

// Success response schema factory
export const createSuccessResponseSchema = <TData extends z.ZodTypeAny>(dataSchema: TData) => {
  return z.object({
    success: z.literal(true),
    data: dataSchema.optional(),
    message: z.string().optional(),
    meta: metaSchema.optional(),
  });
};

// Error response schema
export const errorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  error: apiErrorSchema,
});

// Paginated response schema factory
export const createPaginatedResponseSchema = <TData extends z.ZodTypeAny>(itemSchema: TData) => {
  return z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    message: z.string().optional(),
    meta: z
      .object({
        pagination: paginationSchema,
      })
      .catchall(z.any()),
  });
};

// No content response schema (for 204 responses)
export const noContentResponseSchema = z.void();

// Common response schemas for reuse
export const baseApiResponseSchema = createApiResponseSchema();
export const baseSuccessResponseSchema = createSuccessResponseSchema(z.any());
export const baseErrorResponseSchema = errorResponseSchema;

// Helper type inference
export type ApiResponse<T = any> = z.infer<ReturnType<typeof createApiResponseSchema<z.ZodType<T>>>>;
export type SuccessResponse<T> = z.infer<ReturnType<typeof createSuccessResponseSchema<z.ZodType<T>>>>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type PaginatedResponse<T> = z.infer<ReturnType<typeof createPaginatedResponseSchema<z.ZodType<T>>>>;

// Convenience function for creating response schemas with descriptions
export const responseSchemas = {
  success: <TData extends z.ZodTypeAny>(dataSchema: TData, description?: string) =>
    createSuccessResponseSchema(dataSchema).describe(description || "Success"),

  // For responses with no data (like lock/unlock operations)
  successNoData: (description?: string) =>
    z
      .object({
        success: z.literal(true),
        message: z.string().optional(),
      })
      .describe(description || "Success"),

  error: (description?: string) => errorResponseSchema.describe(description || "Error"),

  paginated: <TData extends z.ZodTypeAny>(itemSchema: TData, description?: string) =>
    createPaginatedResponseSchema(itemSchema).describe(description || "Paginated results"),

  noContent: (description?: string) => noContentResponseSchema.describe(description || "No content"),

  // Common HTTP status responses
  notFound: (description?: string) => errorResponseSchema.describe(description || "Not Found"),

  unauthorized: (description?: string) => errorResponseSchema.describe(description || "Unauthorized"),

  badRequest: (description?: string) => errorResponseSchema.describe(description || "Bad Request"),

  forbidden: (description?: string) => errorResponseSchema.describe(description || "Forbidden"),

  conflict: (description?: string) => errorResponseSchema.describe(description || "Conflict"),

  created: <TData extends z.ZodTypeAny>(dataSchema: TData, description?: string) =>
    createSuccessResponseSchema(dataSchema).describe(description || "Created"),
};
