import { BookingStatus } from "@calcom/prisma/enums";
import { z } from "zod";
/**
 * Common change schemas for audit data
 * These represent old -> new value transitions
 */

export const StringChangeSchema = z.object({
  old: z.string().nullable(),
  new: z.string().nullable(),
});

export const BooleanChangeSchema = z.object({
  old: z.boolean().nullable(),
  new: z.boolean(),
});

export const StringArrayChangeSchema = z.object({
  old: z.array(z.string()).nullable(),
  new: z.array(z.string()),
});

export const NumberChangeSchema = z.object({
  old: z.number().nullable(),
  new: z.number(),
});

export const BookingStatusChangeSchema = z.object({
  old: z.nativeEnum(BookingStatus).nullable(),
  new: z.nativeEnum(BookingStatus),
});
