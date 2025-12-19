import { z } from "zod";

import { StringArrayChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService, TranslationWithParams, GetDisplayTitleParams, GetDisplayJsonParams } from "./IAuditActionService";

/**
 * Attendee Added Audit Action Service
 * Handles ATTENDEE_ADDED action with per-action versioning
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
    attendees: StringArrayChangeSchema,
});

export class AttendeeAddedAuditActionService implements IAuditActionService {
    readonly VERSION = 1;
    public static readonly TYPE = "ATTENDEE_ADDED" as const;
    private static dataSchemaV1 = z.object({
        version: z.literal(1),
        fields: fieldsSchemaV1,
    });
    private static fieldsSchemaV1 = fieldsSchemaV1;
    public static readonly latestFieldsSchema = fieldsSchemaV1;
    // Union of all versions
    public static readonly storedDataSchema = AttendeeAddedAuditActionService.dataSchemaV1;
    // Union of all versions
    public static readonly storedFieldsSchema = AttendeeAddedAuditActionService.fieldsSchemaV1;
    private helper: AuditActionServiceHelper<
        typeof AttendeeAddedAuditActionService.latestFieldsSchema,
        typeof AttendeeAddedAuditActionService.storedDataSchema
    >;

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: AttendeeAddedAuditActionService.latestFieldsSchema,
            storedDataSchema: AttendeeAddedAuditActionService.storedDataSchema,
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
        return { key: "booking_audit_action.attendee_added" };
    }

    getDisplayJson({
        storedData,
    }: GetDisplayJsonParams): AttendeeAddedAuditDisplayData {
        const { fields } = this.parseStored({ version: storedData.version, fields: storedData.fields });
        const previousAttendeesSet = new Set(fields.attendees.old ?? []);
        const addedAttendees = fields.attendees.new.filter(
            (email) => !previousAttendeesSet.has(email)
        );
        return {
            addedAttendees,
        };
    }
}

export type AttendeeAddedAuditData = z.infer<typeof fieldsSchemaV1>;

export type AttendeeAddedAuditDisplayData = {
    addedAttendees: string[];
};
