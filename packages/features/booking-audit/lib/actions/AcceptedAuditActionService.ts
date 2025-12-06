import { z } from "zod";

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

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
    status: StringChangeSchema,
});

export class AcceptedAuditActionService
    implements IAuditActionService<typeof fieldsSchemaV1, typeof fieldsSchemaV1> {
    readonly VERSION = 1;
    public static readonly TYPE = "ACCEPTED";
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

    getDisplayJson(storedData: { version: number; fields: z.infer<typeof fieldsSchemaV1> }): AcceptedAuditDisplayData {
        return {
            previousStatus: storedData.fields.status.old ?? null,
            newStatus: storedData.fields.status.new ?? null,
        };
    }
}

export type AcceptedAuditData = z.infer<typeof fieldsSchemaV1>;

export type AcceptedAuditDisplayData = {
    previousStatus: string | null;
    newStatus: string | null;
};
