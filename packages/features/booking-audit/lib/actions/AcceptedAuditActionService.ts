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

export const acceptedFieldsSchemaV1 = z.object({
    status: StringChangeSchema,
});

// V1 with version wrapper (data schema stored in DB)
export const acceptedDataSchemaV1 = z.object({
    version: z.literal(1),
    fields: acceptedFieldsSchemaV1,
});

// Union of all versions (currently just v1)
export const acceptedDataSchemaAllVersions = acceptedDataSchemaV1;

// Always points to the latest fields schema
export const acceptedFieldsSchema = acceptedFieldsSchemaV1;

export class AcceptedAuditActionService implements IAuditActionService<typeof acceptedFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof acceptedFieldsSchema, typeof acceptedDataSchemaAllVersions>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = acceptedFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: acceptedFieldsSchema,
            allVersionsDataSchema: acceptedDataSchemaAllVersions,
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

