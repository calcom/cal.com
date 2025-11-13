import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Cancelled Audit Action Service
 * Handles CANCELLED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with cancellationReason, cancelledBy, status
 */

const cancelledFieldsSchemaV1 = z.object({
    cancellationReason: StringChangeSchema,
    cancelledBy: StringChangeSchema,
    status: StringChangeSchema,
});

export class CancelledAuditActionService implements IAuditActionService<typeof cancelledFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof cancelledFieldsSchemaV1>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = cancelledFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({ fieldsSchema: cancelledFieldsSchemaV1, version: this.VERSION });
    }

    parseFields(input: unknown) {
        return this.helper.parseFields(input);
    }

    parseStored(data: unknown) {
        return this.helper.parseStored(data);
    }

    getVersion(data: unknown) {
        return this.helper.getVersion(data);
    }

    getDisplaySummary(storedData: { version: number; fields: z.infer<typeof cancelledFieldsSchemaV1> }, t: TFunction): string {
        return t('audit.cancelled_booking');
    }

    getDisplayDetails(storedData: { version: number; fields: z.infer<typeof cancelledFieldsSchemaV1> }, t: TFunction): Record<string, string> {
        const { fields } = storedData;
        return {
            'Cancellation Reason': fields.cancellationReason.new ?? '-',
            'Previous Reason': fields.cancellationReason.old ?? '-',
            'Cancelled By': `${fields.cancelledBy.old ?? '-'} → ${fields.cancelledBy.new ?? '-'}`,
        };
    }
}

export type CancelledAuditData = z.infer<typeof cancelledFieldsSchemaV1>;
