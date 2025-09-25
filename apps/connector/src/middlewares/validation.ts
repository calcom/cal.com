import { validateSchema } from "@/utils/validation";
import type { FastifyRequest, FastifyReply } from "fastify";
import type { z } from "zod";

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    request.validatedBody = validateSchema(schema, request.body);
  };
}

export function validateParams<T>(schema: z.ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    request.validatedParams = validateSchema(schema, request.params);
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    request.validatedQuery = validateSchema(schema, request.query);
  };
}

// Extend FastifyRequest type to include validated data
declare module "fastify" {
  interface FastifyRequest {
    validatedBody?: any;
    validatedParams?: any;
    validatedQuery?: any;
    validatedData?: any;
  }
}
