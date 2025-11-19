import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Rejected Audit Action Service
 * Handles REJECTED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with rejectionReason, status
 */

const rejectedFieldsSchemaV1 = z.object({
    rejectionReason: StringChangeSchema,
    status: StringChangeSchema,
});

export class RejectedAuditActionService implements IAuditActionService<typeof rejectedFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof rejectedFieldsSchemaV1>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = rejectedFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({ fieldsSchema: rejectedFieldsSchemaV1, version: this.VERSION });
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

    getDisplaySummary(storedData: { version: number; fields: z.infer<typeof rejectedFieldsSchemaV1> }, t: TFunction): string {
        return t('audit.rejected_booking');
    }

    getDisplayDetails(storedData: { version: number; fields: z.infer<typeof rejectedFieldsSchemaV1> }, _t: TFunction): Record<string, string> {
        const { fields } = storedData;
        return {
            'Rejection Reason': fields.rejectionReason.new ?? '-',
            'Previous Reason': fields.rejectionReason.old ?? '-',
        };
    }
}

export type RejectedAuditData = z.infer<typeof rejectedFieldsSchemaV1>;
