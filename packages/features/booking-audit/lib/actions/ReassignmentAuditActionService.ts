import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema, NumberChangeSchema } from "../common/changeSchemas";
import type { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Reassignment Audit Action Service
 * Handles REASSIGNMENT action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with assignedToId, assignedById, reassignmentReason, userPrimaryEmail, title
 */

const reassignmentDataSchemaV1 = z.object({
    assignedToId: NumberChangeSchema,
    assignedById: NumberChangeSchema,
    reassignmentReason: StringChangeSchema,
    userPrimaryEmail: StringChangeSchema.optional(),
    title: StringChangeSchema.optional(),
});

export class ReassignmentAuditActionService implements IAuditActionService<typeof reassignmentDataSchemaV1> {
    private helper: AuditActionServiceHelper;

    readonly VERSION = 1;
    readonly dataSchemaV1 = reassignmentDataSchemaV1;

    constructor(helper: AuditActionServiceHelper) {
        this.helper = helper;
    }

    get schema() {
        return z.object({
            version: z.literal(this.VERSION),
            data: this.dataSchemaV1,
        });
    }

    parse(input: unknown): { version: number; data: z.infer<typeof reassignmentDataSchemaV1> } {
        return this.helper.parse({
            version: this.VERSION,
            dataSchema: this.dataSchemaV1,
            input,
        }) as { version: number; data: z.infer<typeof reassignmentDataSchemaV1> };
    }

    parseStored(data: unknown): { version: number; data: z.infer<typeof reassignmentDataSchemaV1> } {
        return this.helper.parseStored({
            schema: this.schema,
            data,
        }) as { version: number; data: z.infer<typeof reassignmentDataSchemaV1> };
    }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
    }

    getDisplaySummary(storedData: { version: number; data: z.infer<typeof reassignmentDataSchemaV1> }, t: TFunction): string {
        return t('audit.booking_reassigned');
    }

    getDisplayDetails(storedData: { version: number; data: z.infer<typeof reassignmentDataSchemaV1> }, _t: TFunction): Record<string, string> {
        const { data } = storedData;
        const details: Record<string, string> = {
            'Assigned To ID': `${data.assignedToId.old ?? '-'} → ${data.assignedToId.new}`,
            'Assigned By ID': `${data.assignedById.old ?? '-'} → ${data.assignedById.new}`,
            'Reason': data.reassignmentReason.new ?? '-',
        };

        if (data.userPrimaryEmail) {
            details['Email'] = `${data.userPrimaryEmail.old ?? '-'} → ${data.userPrimaryEmail.new ?? '-'}`;
        }
        if (data.title) {
            details['Title'] = `${data.title.old ?? '-'} → ${data.title.new ?? '-'}`;
        }

        return details;
    }
}

export type ReassignmentAuditData = z.infer<typeof reassignmentDataSchemaV1>;
