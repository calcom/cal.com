import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Accepted Audit Action Service
 * Handles ACCEPTED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with status
 */

const acceptedFieldsSchemaV1 = z.object({
    status: StringChangeSchema,
});

export class AcceptedAuditActionService implements IAuditActionService<typeof acceptedFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof acceptedFieldsSchemaV1>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = acceptedFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({ fieldsSchema: acceptedFieldsSchemaV1, version: this.VERSION });
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

    getDisplaySummary(storedData: { version: number; fields: z.infer<typeof acceptedFieldsSchemaV1> }, t: TFunction): string {
        return t('audit.accepted_booking');
    }

    getDisplayDetails(storedData: { version: number; fields: z.infer<typeof acceptedFieldsSchemaV1> }, _t: TFunction): Record<string, string> {
        const { fields } = storedData;
        return {
            'Status': `${fields.status.old ?? '-'} → ${fields.status.new ?? '-'}`,
        };
    }
}

export type AcceptedAuditData = z.infer<typeof acceptedFieldsSchemaV1>;

