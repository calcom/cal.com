import { z } from "zod";

import { BooleanChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService, TranslationWithParams, GetDisplayTitleParams, GetDisplayJsonParams } from "./IAuditActionService";

/**
 * Host No-Show Updated Audit Action Service
 * Handles HOST_NO_SHOW_UPDATED action with per-action versioning
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
    noShowHost: BooleanChangeSchema,
});

export class HostNoShowUpdatedAuditActionService implements IAuditActionService {
    readonly VERSION = 1;
    public static readonly TYPE = "HOST_NO_SHOW_UPDATED" as const;
    private static dataSchemaV1 = z.object({
        version: z.literal(1),
        fields: fieldsSchemaV1,
    });
    private static fieldsSchemaV1 = fieldsSchemaV1;
    public static readonly latestFieldsSchema = fieldsSchemaV1;
    // Union of all versions
    public static readonly storedDataSchema = HostNoShowUpdatedAuditActionService.dataSchemaV1;
    // Union of all versions
    public static readonly storedFieldsSchema = HostNoShowUpdatedAuditActionService.fieldsSchemaV1;
    private helper: AuditActionServiceHelper<
        typeof HostNoShowUpdatedAuditActionService.latestFieldsSchema,
        typeof HostNoShowUpdatedAuditActionService.storedDataSchema
    >;

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: HostNoShowUpdatedAuditActionService.latestFieldsSchema,
            storedDataSchema: HostNoShowUpdatedAuditActionService.storedDataSchema,
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
        return { key: "booking_audit_action.host_no_show_updated" };
    }

    getDisplayJson({
        storedData,
    }: GetDisplayJsonParams): HostNoShowUpdatedAuditDisplayData {
        const { fields } = this.parseStored({ version: storedData.version, fields: storedData.fields });
        return {
            noShowHost: fields.noShowHost.new,
            previousNoShowHost: fields.noShowHost.old ?? null,
        };
    }
}

export type HostNoShowUpdatedAuditData = z.infer<typeof fieldsSchemaV1>;

export type HostNoShowUpdatedAuditDisplayData = {
    noShowHost: boolean;
    previousNoShowHost: boolean | null;
};
