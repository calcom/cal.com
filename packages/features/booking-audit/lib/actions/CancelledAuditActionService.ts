import { z } from "zod";

import { StringChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService, TranslationWithParams, GetDisplayTitleParams, GetDisplayJsonParams } from "./IAuditActionService";

/**
 * Cancelled Audit Action Service
 * Handles CANCELLED action with per-action versioning
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
    cancellationReason: StringChangeSchema,
    cancelledBy: StringChangeSchema,
    status: StringChangeSchema,
});

export class CancelledAuditActionService implements IAuditActionService {
    readonly VERSION = 1;
    public static readonly TYPE = "CANCELLED" as const;
    private static dataSchemaV1 = z.object({
        version: z.literal(1),
        fields: fieldsSchemaV1,
    });
    private static fieldsSchemaV1 = fieldsSchemaV1;
    public static readonly latestFieldsSchema = fieldsSchemaV1;
    // Union of all versions
    public static readonly storedDataSchema = CancelledAuditActionService.dataSchemaV1;
    // Union of all versions
    public static readonly storedFieldsSchema = CancelledAuditActionService.fieldsSchemaV1;
    private helper: AuditActionServiceHelper<
        typeof CancelledAuditActionService.latestFieldsSchema,
        typeof CancelledAuditActionService.storedDataSchema
    >;

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: CancelledAuditActionService.latestFieldsSchema,
            storedDataSchema: CancelledAuditActionService.storedDataSchema,
        });
    }

    getVersionedData(fields: unknown) {
        return this.helper.getVersionedData(fields);
    }

    parseStored(data: unknown) {
        return this.helper.parseStored(data);
    }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
    }

    migrateToLatest(data: unknown) {
        // V1-only: validate and return as-is (no migration needed)
        const validated = fieldsSchemaV1.parse(data);
        return { isMigrated: false, latestData: validated };
    }

    async getDisplayTitle(_: GetDisplayTitleParams): Promise<TranslationWithParams> {
        return { key: "booking_audit_action.cancelled" };
    }

    getDisplayJson({
        storedData,
    }: GetDisplayJsonParams): CancelledAuditDisplayData {
        const { fields } = this.parseStored({ version: storedData.version, fields: storedData.fields });
        return {
            cancellationReason: fields.cancellationReason.new ?? null,
            previousReason: fields.cancellationReason.old ?? null,
            cancelledBy: fields.cancelledBy.new ?? null,
            previousCancelledBy: fields.cancelledBy.old ?? null,
            previousStatus: fields.status.old ?? null,
            newStatus: fields.status.new ?? null,
        };
    }
}

export type CancelledAuditData = z.infer<typeof fieldsSchemaV1>;

export type CancelledAuditDisplayData = {
    cancellationReason: string | null;
    previousReason: string | null;
    cancelledBy: string | null;
    previousCancelledBy: string | null;
    previousStatus: string | null;
    newStatus: string | null;
};
