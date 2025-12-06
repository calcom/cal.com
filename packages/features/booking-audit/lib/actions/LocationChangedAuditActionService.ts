import { z } from "zod";

import { StringChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Location Changed Audit Action Service
 * Handles LOCATION_CHANGED action with per-action versioning
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
    location: StringChangeSchema,
});

export class LocationChangedAuditActionService
    implements IAuditActionService<typeof fieldsSchemaV1, typeof fieldsSchemaV1> {
    readonly VERSION = 1;
    public static readonly TYPE = "LOCATION_CHANGED";
    private static dataSchemaV1 = z.object({
        version: z.literal(1),
        fields: fieldsSchemaV1,
    });
    private static fieldsSchemaV1 = fieldsSchemaV1;
    public static readonly latestFieldsSchema = fieldsSchemaV1;
    // Union of all versions
    public static readonly storedDataSchema = LocationChangedAuditActionService.dataSchemaV1;
    // Union of all versions
    public static readonly storedFieldsSchema = LocationChangedAuditActionService.fieldsSchemaV1;
    private helper: AuditActionServiceHelper<
        typeof LocationChangedAuditActionService.latestFieldsSchema,
        typeof LocationChangedAuditActionService.storedDataSchema
    >;

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: LocationChangedAuditActionService.latestFieldsSchema,
            storedDataSchema: LocationChangedAuditActionService.storedDataSchema,
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

    getDisplayJson(storedData: { version: number; fields: z.infer<typeof fieldsSchemaV1> }): LocationChangedAuditDisplayData {
        const { fields } = storedData;
        return {
            previousLocation: fields.location.old ?? null,
            newLocation: fields.location.new ?? null,
        };
    }
}

export type LocationChangedAuditData = z.infer<typeof fieldsSchemaV1>;

export type LocationChangedAuditDisplayData = {
    previousLocation: string | null;
    newLocation: string | null;
};
