import { z } from "zod";
import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.extend({
  enabled: z.boolean().optional(),
});

export const appKeysSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});

export const zoominfoEnrichedDataSchema = z.object({
  contactId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  jobFunction: z.string().optional(),
  managementLevel: z.string().optional(),
  companyId: z.string().optional(),
  companyName: z.string().optional(),
  companyWebsite: z.string().optional(),
  companyIndustry: z.string().optional(),
  companyRevenue: z.string().optional(),
  companyEmployeeCount: z.number().optional(),
  companyCity: z.string().optional(),
  companyState: z.string().optional(),
  companyCountry: z.string().optional(),
  linkedInUrl: z.string().optional(),
  enrichedAt: z.string().optional(),
});

export type ZoomInfoEnrichedData = z.infer<typeof zoominfoEnrichedDataSchema>;
