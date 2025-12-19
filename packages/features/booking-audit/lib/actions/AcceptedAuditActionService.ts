import type { BookingStatus } from "@calcom/prisma/enums";
import { z } from "zod";

import { BookingStatusChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService, TranslationWithParams, GetDisplayTitleParams, GetDisplayJsonParams } from "./IAuditActionService";

/**
 * Accepted Audit Action Service
 * Handles ACCEPTED action with per-action versioning
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
    status: BookingStatusChangeSchema,
});

export class AcceptedAuditActionService implements IAuditActionService {
    readonly VERSION = 1;
    public static readonly TYPE = "ACCEPTED" as const;
    private static dataSchemaV1 = z.object({
        version: z.literal(1),
        fields: fieldsSchemaV1,
    });
    private static fieldsSchemaV1 = fieldsSchemaV1;
    public static readonly latestFieldsSchema = fieldsSchemaV1;
    // Union of all versions
    public static readonly storedDataSchema = AcceptedAuditActionService.dataSchemaV1;
    // Union of all versions
    public static readonly storedFieldsSchema = AcceptedAuditActionService.fieldsSchemaV1;
    private helper: AuditActionServiceHelper<
        typeof AcceptedAuditActionService.latestFieldsSchema,
        typeof AcceptedAuditActionService.storedDataSchema
    >;

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: AcceptedAuditActionService.latestFieldsSchema,
            storedDataSchema: AcceptedAuditActionService.storedDataSchema,
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
        return { key: "booking_audit_action.accepted" };
    }

    getDisplayJson({
        storedData,
    }: GetDisplayJsonParams): AcceptedAuditDisplayData {
        const { fields } = this.parseStored({ version: storedData.version, fields: storedData.fields });
        return {
            previousStatus: fields.status.old ?? null,
            newStatus: fields.status.new ?? null,
        };
    }
}

export type AcceptedAuditData = z.infer<typeof fieldsSchemaV1>;

export type AcceptedAuditDisplayData = {
    previousStatus: BookingStatus | null;
    newStatus: BookingStatus | null;
};
