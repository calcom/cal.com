import { z } from "zod";

/**
 * Schema for Google Working Location types
 */
export const ZGoogleWorkingLocationTypeSchema = z.enum(["homeOffice", "officeLocation", "customLocation"]);

/**
 * Schema for creating a schedule synced with Google Calendar Working Location
 */
export const ZCreateFromGoogleWorkingLocationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  credentialId: z.number().int().positive(),
  calendarId: z.string().default("primary"),
  locationTypes: z.array(ZGoogleWorkingLocationTypeSchema).min(1, "At least one location type is required"),
  locationLabel: z.string().optional(),
});

export type TCreateFromGoogleWorkingLocationSchema = z.infer<typeof ZCreateFromGoogleWorkingLocationSchema>;

/**
 * Schema for syncing a schedule with Google Calendar Working Location
 */
export const ZSyncGoogleWorkingLocationSchema = z.object({
  scheduleId: z.number().int().positive(),
});

export type TSyncGoogleWorkingLocationSchema = z.infer<typeof ZSyncGoogleWorkingLocationSchema>;

/**
 * Schema for disconnecting a schedule from Google Calendar Working Location sync
 */
export const ZDisconnectGoogleWorkingLocationSchema = z.object({
  scheduleId: z.number().int().positive(),
});

export type TDisconnectGoogleWorkingLocationSchema = z.infer<typeof ZDisconnectGoogleWorkingLocationSchema>;
