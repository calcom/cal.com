import { z } from "zod";

import { StringChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService, TranslationWithParams } from "./IAuditActionService";

/**
 * Rescheduled Audit Action Service
 * Handles RESCHEDULED action with per-action versioning
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
    startTime: StringChangeSchema,
    endTime: StringChangeSchema,
    rescheduledToUid: StringChangeSchema,
});

export class RescheduledAuditActionService
    implements IAuditActionService<typeof fieldsSchemaV1, typeof fieldsSchemaV1> {
    readonly VERSION = 1;
    public static readonly TYPE = "RESCHEDULED" as const;
    private static dataSchemaV1 = z.object({
        version: z.literal(1),
        fields: fieldsSchemaV1,
    });
    private static fieldsSchemaV1 = fieldsSchemaV1;
    public static readonly latestFieldsSchema = fieldsSchemaV1;
    // Union of all versions
    public static readonly storedDataSchema = RescheduledAuditActionService.dataSchemaV1;
    // Union of all versions
    public static readonly storedFieldsSchema = RescheduledAuditActionService.fieldsSchemaV1;
    private helper: AuditActionServiceHelper<
        typeof RescheduledAuditActionService.latestFieldsSchema,
        typeof RescheduledAuditActionService.storedDataSchema
    >;

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: RescheduledAuditActionService.latestFieldsSchema,
            storedDataSchema: RescheduledAuditActionService.storedDataSchema,
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

    async getDisplayTitle(): Promise<TranslationWithParams> {
        return { key: "booking_audit_action.rescheduled" };
    }

    getDisplayJson(storedData: { version: number; fields: z.infer<typeof fieldsSchemaV1> }): RescheduledAuditDisplayData {
        const { fields } = storedData;
        return {
            previousStartTime: fields.startTime.old ?? null,
            newStartTime: fields.startTime.new ?? null,
            previousEndTime: fields.endTime.old ?? null,
            newEndTime: fields.endTime.new ?? null,
            rescheduledToUid: fields.rescheduledToUid.new ?? null,
        };
    }
}

export type RescheduledAuditData = z.infer<typeof fieldsSchemaV1>;

export type RescheduledAuditDisplayData = {
    previousStartTime: string | null;
    newStartTime: string | null;
    previousEndTime: string | null;
    newEndTime: string | null;
    rescheduledToUid: string | null;
};
