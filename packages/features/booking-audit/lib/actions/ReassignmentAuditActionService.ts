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

const reassignmentFieldsSchemaV1 = z.object({
    assignedToId: NumberChangeSchema,
    assignedById: NumberChangeSchema,
    reassignmentReason: StringChangeSchema,
    userPrimaryEmail: StringChangeSchema.optional(),
    title: StringChangeSchema.optional(),
});

export class ReassignmentAuditActionService implements IAuditActionService<typeof reassignmentFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof reassignmentFieldsSchemaV1>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = reassignmentFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({ fieldsSchema: reassignmentFieldsSchemaV1, version: this.VERSION });
    }

    parseFields(input: unknown) {
        return this.helper.parseFields(input);
    }

    parseStored(data: unknown) {
        return this.helper.parseStored(data);
    }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
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
