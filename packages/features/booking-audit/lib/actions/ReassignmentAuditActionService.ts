import { z } from "zod";
import type { TFunction } from "next-i18next";

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

export const reassignmentFieldsSchemaV1 = z.object({
    assignedToId: NumberChangeSchema,
    assignedById: NumberChangeSchema,
    reassignmentReason: StringChangeSchema,
    userPrimaryEmail: StringChangeSchema.optional(),
    title: StringChangeSchema.optional(),
});

// V1 with version wrapper (data schema stored in DB)
export const reassignmentDataSchemaV1 = z.object({
    version: z.literal(1),
    fields: reassignmentFieldsSchemaV1,
});

// Union of all versions (currently just v1)
export const reassignmentDataSchemaAllVersions = reassignmentDataSchemaV1;

// Always points to the latest fields schema

export const reassignmentFieldsSchema = reassignmentFieldsSchemaV1;

export class ReassignmentAuditActionService implements IAuditActionService<typeof reassignmentFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof reassignmentFieldsSchema, typeof reassignmentDataSchemaAllVersions>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = reassignmentFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: reassignmentFieldsSchema,
            allVersionsDataSchema: reassignmentDataSchemaAllVersions,
        });
    }

    parseFieldsWithLatest(input: unknown) {
        return this.helper.parseFieldsWithLatest(input);
    }

    parseStored(data: unknown) {
        return this.helper.parseStored(data);
    }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
    }

    migrateToLatest(data: unknown) {
        // V1-only: validate and return as-is (no migration needed)
        const validated = this.fieldsSchemaV1.parse(data);
        return { isMigrated: false, latestData: validated };
    }

    getDisplaySummary(storedData: { version: number; fields: z.infer<typeof reassignmentFieldsSchemaV1> }, t: TFunction): string {
        return t('audit.booking_reassigned');
    }

    getDisplayDetails(storedData: { version: number; fields: z.infer<typeof reassignmentFieldsSchemaV1> }, _t: TFunction): Record<string, string> {
        const { fields } = storedData;
        const details: Record<string, string> = {
            'Assigned To ID': `${fields.assignedToId.old ?? '-'} → ${fields.assignedToId.new}`,
            'Assigned By ID': `${fields.assignedById.old ?? '-'} → ${fields.assignedById.new}`,
            'Reason': fields.reassignmentReason.new ?? '-',
        };

        if (fields.userPrimaryEmail) {
            details['Email'] = `${fields.userPrimaryEmail.old ?? '-'} → ${fields.userPrimaryEmail.new ?? '-'}`;
        }
        if (fields.title) {
            details['Title'] = `${fields.title.old ?? '-'} → ${fields.title.new ?? '-'}`;
        }

        return details;
    }
}

export type ReassignmentAuditData = z.infer<typeof reassignmentFieldsSchemaV1>;
