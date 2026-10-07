// Zod runtime validation and inferred types: https://zod.dev/
import { z } from "zod";

export const appDataSchema = z.object({
  userId: z.number().int().positive().optional(),
  serverId: z.number().int().positive().optional(),
  serverUrl: z.string().min(1).optional(),
});

export const appKeysSchema = z.object({
  moderatorHost: z.string().min(1).optional(),
  auth0Domain: z.string().min(1).optional(),
  auth0Audience: z.string().min(1).optional(),
  auth0TokenUrl: z.string().url().optional(),
  auth0ClientId: z.string().min(1).optional(),
  auth0ClientSecret: z.string().min(1).optional(),
});

export const setupResponseSchema = z.object({
  userId: z.number().int().positive(),
  servers: z.array(
    z.object({
      id: z.number().int().positive(),
      name: z.string(),
      serverUrl: z.string(),
      serverType: z.enum(["CUSTOM", "DEFAULT"]),
    })
  ),
});

export const locationResponseSchema = z.object({
  moderatorLocationEnabled: z.boolean(),
});
