import { z } from "zod";
import { AUDIT_ACTION_METADATA, AuditActionSchema } from "./auditAction";
import { PiiFreeAuditActorSchema } from "./actor";
import { AuditResultSchema, AuditRetentionTierSchema } from "./auditClassification";
import { ValidAuditSourceSchema } from "./auditSource";
import { AuditTargetTypeSchema } from "./auditTarget";

const AuditEventTaskInputSchema = z
  .object({
    // Who
    actor: PiiFreeAuditActorSchema,

    // What
    action: AuditActionSchema,
    result: AuditResultSchema.default("SUCCESS"),
    source: ValidAuditSourceSchema,

    // Where
    targetType: AuditTargetTypeSchema.nullable(),
    targetId: z.string().nullable(),

    // What changed
    previousValue: z.string().nullable(),
    newValue: z.string().nullable(),

    // When — milliseconds since epoch, mirrors DB createdAt
    createdAt: z.number().int().positive(),

    // Context
    operationId: z.string().min(1),
    orgId: z.number().nullable(),
    ipHash: z.string().nullable(),
    userAgent: z.string().nullable(),
    traceId: z.string().nullable(),
    impersonatedBy: z.string().uuid().nullable(),

    // Retention
    retentionTier: AuditRetentionTierSchema.default("STANDARD"),
  })
  .refine(
    (data) => (data.targetType === null) === (data.targetId === null),
    { message: "targetType and targetId must both be present or both be null" }
  );

// Derive classification from action metadata — callers don't pass these
export const AuditEventTaskPayloadSchema = AuditEventTaskInputSchema.transform((data) => {
  const meta = AUDIT_ACTION_METADATA[data.action];
  return {
    ...data,
    category: meta.category,
    visibility: meta.visibility,
    sensitivityLevel: meta.sensitivity,
  };
});

export type AuditEventTaskPayload = z.output<typeof AuditEventTaskPayloadSchema>;
export type AuditEventTaskInput = z.input<typeof AuditEventTaskPayloadSchema>;
