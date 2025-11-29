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

export const cancelledFieldsSchemaV1 = z.object({
    cancellationReason: StringChangeSchema,
    cancelledBy: StringChangeSchema,
    status: StringChangeSchema,
});

// V1 with version wrapper (data schema stored in DB)
export const cancelledDataSchemaV1 = z.object({
    version: z.literal(1),
    fields: cancelledFieldsSchemaV1,
});

// Union of all versions (currently just v1)
export const cancelledDataSchemaAllVersions = cancelledDataSchemaV1;

// Always points to the latest fields schema
export const cancelledFieldsSchema = cancelledFieldsSchemaV1;

export class CancelledAuditActionService implements IAuditActionService<typeof cancelledFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof cancelledFieldsSchema, typeof cancelledDataSchemaAllVersions>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = cancelledFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: cancelledFieldsSchema,
            allVersionsDataSchema: cancelledDataSchemaAllVersions,
        });
    }

    parseFieldsWithLatest(input: unknown) {
        return this.helper.parseFieldsWithLatest(input);
    }

    parseStored(data: unknown) {
        return this.helper.parseStored(data);
    }

    getVersion(data: unknown) {
        return this.helper.getVersion(data);
    }

    migrateToLatest(data: unknown) {
        // V1-only: validate and return as-is (no migration needed)
        const validated = this.fieldsSchemaV1.parse(data);
        return { isMigrated: false, latestData: validated };
    }

    getDisplaySummary(storedData: { version: number; fields: z.infer<typeof cancelledFieldsSchemaV1> }, t: TFunction): string {
        return t('audit.cancelled_booking');
    }

    getDisplayDetails(storedData: { version: number; fields: z.infer<typeof cancelledFieldsSchemaV1> }, _t: TFunction): Record<string, string> {
        const { fields } = storedData;
        return {
            'Cancellation Reason': fields.cancellationReason.new ?? '-',
            'Previous Reason': fields.cancellationReason.old ?? '-',
            'Cancelled By': `${fields.cancelledBy.old ?? '-'} → ${fields.cancelledBy.new ?? '-'}`,
        };
    }
}

export type CancelledAuditData = z.infer<typeof cancelledFieldsSchemaV1>;
