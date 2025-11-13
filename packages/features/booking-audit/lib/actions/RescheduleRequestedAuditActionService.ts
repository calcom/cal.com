import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema, BooleanChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Reschedule Requested Audit Action Service
 * Handles RESCHEDULE_REQUESTED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with cancellationReason, cancelledBy, rescheduled
 */

const rescheduleRequestedFieldsSchemaV1 = z.object({
    cancellationReason: StringChangeSchema,
    cancelledBy: StringChangeSchema,
    rescheduled: BooleanChangeSchema.optional(),
});

export class RescheduleRequestedAuditActionService implements IAuditActionService<typeof rescheduleRequestedFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof rescheduleRequestedFieldsSchemaV1>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = rescheduleRequestedFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({ fieldsSchema: rescheduleRequestedFieldsSchemaV1, version: this.VERSION });
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

    getDisplaySummary(storedData: { version: number; fields: z.infer<typeof rescheduleRequestedFieldsSchemaV1> }, t: TFunction): string {
        return t('audit.reschedule_requested');
    }

    getDisplayDetails(storedData: { version: number; fields: z.infer<typeof rescheduleRequestedFieldsSchemaV1> }, t: TFunction): Record<string, string> {
        const { fields } = storedData;
        const details: Record<string, string> = {};
        if (fields.cancellationReason) {
            details['Reason'] = fields.cancellationReason.new ?? '-';
        }
        if (fields.cancelledBy) {
            details['Cancelled By'] = `${fields.cancelledBy.old ?? '-'} → ${fields.cancelledBy.new ?? '-'}`;
        }
        if (fields.rescheduled) {
            details['Rescheduled'] = `${fields.rescheduled.old ?? false} → ${fields.rescheduled.new}`;
        }
        return details;
    }
}

export type RescheduleRequestedAuditData = z.infer<typeof rescheduleRequestedFieldsSchemaV1>;
