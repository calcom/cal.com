import { z } from "zod";

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

const GuestActorSchema = z.object({
  identifiedBy: z.literal("guest"),
  email: z.string(),
  name: z.string().nullable(),
});

const SystemActorSchema = z.object({
  identifiedBy: z.literal("system"),
  identifier: z.string(),
  name: z.string(),
});

const AppActorSchema = z.object({
  identifiedBy: z.literal("app"),
  appSlug: z.string(),
  name: z.string(),
});

export const ActorSchema = z.discriminatedUnion("identifiedBy", [
  ActorByIdSchema,
  UserActorSchema,
  AttendeeActorSchema,
  GuestActorSchema,
  SystemActorSchema,
  AppActorSchema,
]);

export const PIIFreeActorSchema = z.discriminatedUnion("identifiedBy", [
  ActorByIdSchema,
  UserActorSchema,
  AttendeeActorSchema,
]);

export type Actor = z.infer<typeof ActorSchema>;
export type PIIFreeActor = z.infer<typeof PIIFreeActorSchema>;

type UserActor = z.infer<typeof UserActorSchema>;
type AttendeeActor = z.infer<typeof AttendeeActorSchema>;
type ActorById = z.infer<typeof ActorByIdSchema>;
type GuestActor = z.infer<typeof GuestActorSchema>;
type SystemActor = z.infer<typeof SystemActorSchema>;
type AppActor = z.infer<typeof AppActorSchema>;
/**
 * Creates an Actor representing a User by UUID
 */
export function makeUserActor(userUuid: string): UserActor {
  return {
    identifiedBy: "user",
    userUuid,
  };
}

export function makeGuestActor({ email, name }: { email: string, name: string | null }): GuestActor {
  return {
    identifiedBy: "guest",
    email,
    name: name ?? null,
  };
}

/**
 * Creates an Actor representing the System
 * System actors must be referenced by ID (requires migration)
 */
export function makeSystemActor({ identifier, name }: { identifier: string, name: string }): SystemActor {
  return {
    identifiedBy: "system",
    identifier,
    name,
  };
}


/**
 * Creates an Actor by existing actor ID
 */
export function makeActorById(id: string): ActorById {
  return {
    identifiedBy: "id",
    id,
  };
}

/**
 * Creates an Actor representing an Attendee by attendee ID
 */
export function makeAttendeeActor(attendeeId: number): AttendeeActor {
  return {
    identifiedBy: "attendee",
    attendeeId,
  };
}

/**
 * Creates an Actor representing an App by app slug
 * App actors use @app.internal email convention
 */
export function makeAppActor(params: { appSlug: string; name: string }): AppActor {
  return {
    identifiedBy: "app",
    appSlug: params.appSlug,
    name: params.name,
  };
}

export function buildActorEmail({ identifier, actorType }: { identifier: string, actorType: "system" | "guest" | "app" }): string {
  return `${identifier}@${actorType}.internal`;
}

// System actor ID constant
export const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";
