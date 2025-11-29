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

export const rescheduleRequestedFieldsSchemaV1 = z.object({
    cancellationReason: StringChangeSchema,
    cancelledBy: StringChangeSchema,
    rescheduled: BooleanChangeSchema.optional(),
});

// V1 with version wrapper (data schema stored in DB)
export const rescheduleRequestedDataSchemaV1 = z.object({
    version: z.literal(1),
    fields: rescheduleRequestedFieldsSchemaV1,
});

// Union of all versions (currently just v1)
export const rescheduleRequestedDataSchemaAllVersions = rescheduleRequestedDataSchemaV1;

// Always points to the latest fields schema
export const rescheduleRequestedFieldsSchema = rescheduleRequestedFieldsSchemaV1;

export class RescheduleRequestedAuditActionService implements IAuditActionService<typeof rescheduleRequestedFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof rescheduleRequestedFieldsSchema, typeof rescheduleRequestedDataSchemaAllVersions>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = rescheduleRequestedFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: rescheduleRequestedFieldsSchema,
            allVersionsDataSchema: rescheduleRequestedDataSchemaAllVersions,
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

    getDisplaySummary(storedData: { version: number; fields: z.infer<typeof rescheduleRequestedFieldsSchemaV1> }, t: TFunction): string {
        return t('audit.reschedule_requested');
    }

    getDisplayDetails(storedData: { version: number; fields: z.infer<typeof rescheduleRequestedFieldsSchemaV1> }, _t: TFunction): Record<string, string> {
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
