import { z } from "zod";

import { StringArrayChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService, TranslationWithParams, GetDisplayTitleParams, GetDisplayJsonParams } from "./IAuditActionService";

/**
 * Attendee Removed Audit Action Service
 * Handles ATTENDEE_REMOVED action with per-action versioning
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
    attendees: StringArrayChangeSchema,
});

export class AttendeeRemovedAuditActionService implements IAuditActionService {
    readonly VERSION = 1;
    public static readonly TYPE = "ATTENDEE_REMOVED" as const;
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

    async getDisplayTitle(_: GetDisplayTitleParams): Promise<TranslationWithParams> {
        return { key: "booking_audit_action.attendee_removed" };
    }

    getDisplayJson({
        storedData,
    }: GetDisplayJsonParams): AttendeeRemovedAuditDisplayData {
        const { fields } = this.parseStored({ version: storedData.version, fields: storedData.fields });
        const remainingAttendeesSet = new Set(fields.attendees.new ?? []);
        const removedAttendees = (fields.attendees.old ?? []).filter(
            (email) => !remainingAttendeesSet.has(email)
        );
        return {
            removedAttendees,
        };
    }
}

export type AttendeeRemovedAuditData = z.infer<typeof fieldsSchemaV1>;

export type AttendeeRemovedAuditDisplayData = {
    removedAttendees: string[];
};
