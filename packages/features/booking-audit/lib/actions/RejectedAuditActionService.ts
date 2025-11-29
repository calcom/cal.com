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

export const rejectedFieldsSchemaV1 = z.object({
    rejectionReason: StringChangeSchema,
    status: StringChangeSchema,
});

// Union of all supported versions (for task payload validation)
// Currently only V1 exists. When V2 is added, change to: z.union([rejectedFieldsSchemaV1, rejectedFieldsSchemaV2])
// V1 with version wrapper (data schema stored in DB)
export const rejectedDataSchemaV1 = z.object({
    version: z.literal(1),
    fields: rejectedFieldsSchemaV1,
});

// Union of all versions (currently just v1)
export const rejectedDataSchemaAllVersions = rejectedDataSchemaV1;

// Always points to the latest fields schema

// Latest version alias (for producers)
export const rejectedFieldsSchema = rejectedFieldsSchemaV1;

export class RejectedAuditActionService implements IAuditActionService<typeof rejectedFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof rejectedFieldsSchema, typeof rejectedDataSchemaAllVersions>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = rejectedFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: rejectedFieldsSchema,
            allVersionsDataSchema: rejectedDataSchemaAllVersions,
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
