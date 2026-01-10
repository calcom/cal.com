import { z } from "zod";

import { StringChangeSchema, BooleanChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService, TranslationWithParams, GetDisplayTitleParams, GetDisplayJsonParams } from "./IAuditActionService";

/**
 * Reschedule Requested Audit Action Service
 * Handles RESCHEDULE_REQUESTED action with per-action versioning
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
    cancellationReason: StringChangeSchema,
    cancelledBy: StringChangeSchema,
    rescheduled: BooleanChangeSchema.optional(),
});

export class RescheduleRequestedAuditActionService implements IAuditActionService {
    readonly VERSION = 1;
    public static readonly TYPE = "RESCHEDULE_REQUESTED" as const;
    private static dataSchemaV1 = z.object({
        version: z.literal(1),
        fields: fieldsSchemaV1,
    });
    private static fieldsSchemaV1 = fieldsSchemaV1;
    public static readonly latestFieldsSchema = fieldsSchemaV1;
    // Union of all versions
    public static readonly storedDataSchema = RescheduleRequestedAuditActionService.dataSchemaV1;
    // Union of all versions
    public static readonly storedFieldsSchema = RescheduleRequestedAuditActionService.fieldsSchemaV1;
    private helper: AuditActionServiceHelper<
        typeof RescheduleRequestedAuditActionService.latestFieldsSchema,
        typeof RescheduleRequestedAuditActionService.storedDataSchema
    >;

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: RescheduleRequestedAuditActionService.latestFieldsSchema,
            storedDataSchema: RescheduleRequestedAuditActionService.storedDataSchema,
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
        return { key: "booking_audit_action.reschedule_requested" };
    }

    getDisplayJson({
        storedData,
    }: GetDisplayJsonParams): RescheduleRequestedAuditDisplayData {
        const { fields } = this.parseStored(storedData);
        return {
            reason: fields.cancellationReason.new ?? null,
            requestedBy: fields.cancelledBy.new ?? null,
        };
    }
}

export type RescheduleRequestedAuditData = z.infer<typeof fieldsSchemaV1>;

export type RescheduleRequestedAuditDisplayData = {
    reason: string | null;
    requestedBy: string | null;
};
