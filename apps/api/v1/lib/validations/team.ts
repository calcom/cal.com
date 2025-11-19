import { z } from "zod";

import { TeamSchema } from "@calcom/prisma/zod/modelSchema/TeamSchema";

export const schemaTeamBaseBodyParams = TeamSchema.omit({ id: true, createdAt: true }).partial({
  hideBranding: true,
  metadata: true,
  pendingPayment: true,
  isOrganization: true,
  isPlatform: true,
  smsLockState: true,
  smsLockReviewedByAdmin: true,
  bookingLimits: true,
  includeManagedEventsInLimits: true,
});

const schemaTeamRequiredParams = z.object({
  name: z.string().max(255),
});

export const schemaTeamBodyParams = schemaTeamBaseBodyParams.merge(schemaTeamRequiredParams).strict();

export const schemaTeamUpdateBodyParams = schemaTeamBodyParams.partial();

const schemaOwnerId = z.object({
  ownerId: z.number().optional(),
});

export const schemaTeamCreateBodyParams = schemaTeamBodyParams.merge(schemaOwnerId).strict();

export const schemaTeamReadPublic = TeamSchema.omit({});

export const schemaTeamsReadPublic = z.array(schemaTeamReadPublic);
