import { z } from "zod";

import { StringArrayChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Attendee Removed Audit Action Service
 * Handles ATTENDEE_REMOVED action with per-action versioning
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
    removedAttendees: StringArrayChangeSchema,
});

export class AttendeeRemovedAuditActionService
    implements IAuditActionService<typeof fieldsSchemaV1, typeof fieldsSchemaV1> {
    readonly VERSION = 1;
    public static readonly TYPE = "ATTENDEE_REMOVED";
    private static dataSchemaV1 = z.object({
        version: z.literal(1),
        fields: fieldsSchemaV1,
    });
    private static fieldsSchemaV1 = fieldsSchemaV1;
    public static readonly latestFieldsSchema = fieldsSchemaV1;
    // Union of all versions
    public static readonly storedDataSchema = AttendeeRemovedAuditActionService.dataSchemaV1;
    // Union of all versions
    public static readonly storedFieldsSchema = AttendeeRemovedAuditActionService.fieldsSchemaV1;
    private helper: AuditActionServiceHelper<
        typeof AttendeeRemovedAuditActionService.latestFieldsSchema,
        typeof AttendeeRemovedAuditActionService.storedDataSchema
    >;

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: AttendeeRemovedAuditActionService.latestFieldsSchema,
            storedDataSchema: AttendeeRemovedAuditActionService.storedDataSchema,
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

    getDisplayJson(storedData: { version: number; fields: z.infer<typeof fieldsSchemaV1> }): AttendeeRemovedAuditDisplayData {
        const { fields } = storedData;
        return {
            removedAttendees: fields.removedAttendees.new,
            previousAttendees: fields.removedAttendees.old ?? [],
            count: fields.removedAttendees.new.length,
        };
    }
}

export type AttendeeRemovedAuditData = z.infer<typeof fieldsSchemaV1>;

export type AttendeeRemovedAuditDisplayData = {
    removedAttendees: string[];
    previousAttendees: string[];
    count: number;
};
