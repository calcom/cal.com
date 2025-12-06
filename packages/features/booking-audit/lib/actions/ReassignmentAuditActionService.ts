import { z } from "zod";

import { StringChangeSchema, NumberChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Reassignment Audit Action Service
 * Handles REASSIGNMENT action with per-action versioning
 *
 * Version History:
 * - v1: Initial schema with assignedToId, assignedById, reassignmentReason, userPrimaryEmail, title
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
    assignedToId: NumberChangeSchema,
    assignedById: NumberChangeSchema,
    reassignmentReason: StringChangeSchema,
    userPrimaryEmail: StringChangeSchema.optional(),
    title: StringChangeSchema.optional(),
});

export class ReassignmentAuditActionService
    implements IAuditActionService<typeof fieldsSchemaV1, typeof fieldsSchemaV1> {
    readonly VERSION = 1;
    public static readonly TYPE = "REASSIGNMENT";
    private static dataSchemaV1 = z.object({
        version: z.literal(1),
        fields: fieldsSchemaV1,
    });
    private static fieldsSchemaV1 = fieldsSchemaV1;
    public static readonly latestFieldsSchema = fieldsSchemaV1;
    // Union of all versions
    public static readonly storedDataSchema = ReassignmentAuditActionService.dataSchemaV1;
    // Union of all versions
    public static readonly storedFieldsSchema = ReassignmentAuditActionService.fieldsSchemaV1;
    private helper: AuditActionServiceHelper<
        typeof ReassignmentAuditActionService.latestFieldsSchema,
        typeof ReassignmentAuditActionService.storedDataSchema
    >;

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: ReassignmentAuditActionService.latestFieldsSchema,
            storedDataSchema: ReassignmentAuditActionService.storedDataSchema,
        });
    }

    getVersionedData(fields: unknown) {
        return this.helper.getVersionedData(fields);
    }

    parseStored(data: unknown) {
        return this.helper.parseStored(data);
    }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
    }

    migrateToLatest(data: unknown) {
        // V1-only: validate and return as-is (no migration needed)
        const validated = fieldsSchemaV1.parse(data);
        return { isMigrated: false, latestData: validated };
    }

    getDisplayJson(storedData: { version: number; fields: z.infer<typeof fieldsSchemaV1> }): ReassignmentAuditDisplayData {
        const { fields } = storedData;
        return {
            previousAssignedToId: fields.assignedToId.old ?? null,
            newAssignedToId: fields.assignedToId.new,
            previousAssignedById: fields.assignedById.old ?? null,
            newAssignedById: fields.assignedById.new,
            reassignmentReason: fields.reassignmentReason.new ?? null,
            previousEmail: fields.userPrimaryEmail?.old ?? null,
            newEmail: fields.userPrimaryEmail?.new ?? null,
            previousTitle: fields.title?.old ?? null,
            newTitle: fields.title?.new ?? null,
        };
    }
}

export type ReassignmentAuditData = z.infer<typeof fieldsSchemaV1>;

export type ReassignmentAuditDisplayData = {
    previousAssignedToId: number | null;
    newAssignedToId: number;
    previousAssignedById: number | null;
    newAssignedById: number;
    reassignmentReason: string | null;
    previousEmail: string | null;
    newEmail: string | null;
    previousTitle: string | null;
    newTitle: string | null;
};
