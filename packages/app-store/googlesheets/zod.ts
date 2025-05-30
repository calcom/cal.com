import { z } from "zod";

export const googleSheetsKeysSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});

export const googleSheetsConfigSchema = z.object({
  enabled: z.boolean().default(false),
  spreadsheetUrl: z.string().optional(),
  spreadsheetId: z.string().optional(),
});