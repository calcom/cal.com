import { z } from "zod";

/**
 * PII-Free Actor schemas for booking audit
 * 
 * These schemas define actors that can be safely stored and processed
 * without containing Personally Identifiable Information (PII).
 * They reference actors by ID or by their database identifiers.
 */

const UserActorSchema = z.object({
    identifiedBy: z.literal("user"),
    userUuid: z.string(),
});

const AttendeeActorSchema = z.object({
    identifiedBy: z.literal("attendee"),
    attendeeId: z.number(),
});

const ActorByIdSchema = z.object({
    identifiedBy: z.literal("id"),
    id: z.string(),
});

/**
 * PIIFreeActorSchema - Schema for actors without PII
 * Used in booking audit tasks where we only need to reference actors by ID
 */
export const PIIFreeActorSchema = z.discriminatedUnion("identifiedBy", [
    ActorByIdSchema,
    UserActorSchema,
    AttendeeActorSchema,
]);

export type PIIFreeActor = z.infer<typeof PIIFreeActorSchema>;
