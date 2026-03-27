import { z } from "zod";

const UserActorSchema = z.object({
  userUuid: z.string().uuid(),
});

const ResolvedActorSchema = z.object({
  actorId: z.string().uuid(),
});

// Wave 1 actors are always authenticated users.
// System actors (cron, Trigger.dev) can be added when Wave 3 requires them.
export const AuditActorSchema = z.union([ResolvedActorSchema, UserActorSchema]);

// PII-free schema for Tasker payloads — explicitly picks only safe fields.
// If PII fields are added to actor schemas in the future, they won't leak here.
export const PiiFreeAuditActorSchema = z.union([
  ResolvedActorSchema.pick({ actorId: true }),
  UserActorSchema.pick({ userUuid: true }),
]);

export type AuditActor = z.infer<typeof AuditActorSchema>;
export type PiiFreeAuditActor = z.infer<typeof PiiFreeAuditActorSchema>;
export type UserActor = z.infer<typeof UserActorSchema>;
export type ResolvedActor = z.infer<typeof ResolvedActorSchema>;
