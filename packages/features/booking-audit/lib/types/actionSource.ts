import { z } from "zod";

// This is the schema for DB value, here we use UNKNOWN in case client didn't pass an explicit action source.
// SYSTEM is used for background jobs (tasker tasks, trigger.dev, etc.)
export const ActionSourceSchema = z.enum([
  "API_V1",
  "API_V2",
  "WEBAPP",
  "WEBHOOK",
  "MAGIC_LINK",
  "SYSTEM",
  "UNKNOWN",
]);
export type ActionSource = z.infer<typeof ActionSourceSchema>;

// We don't keep UNKNOWN here because we don't want clients to pass UNKNOWN.
// SYSTEM is used for background jobs (tasker tasks, trigger.dev, etc.)
export const ValidActionSourceSchema = z.enum([
  "API_V1",
  "API_V2",
  "WEBAPP",
  "WEBHOOK",
  "MAGIC_LINK",
  "SYSTEM",
]);
export type ValidActionSource = z.infer<typeof ValidActionSourceSchema>;
