import { z } from "zod";

import { BooleanChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService, TranslationWithParams, GetDisplayTitleParams, GetDisplayJsonParams } from "./IAuditActionService";

/**
 * Attendee No-Show Updated Audit Action Service
 * Handles ATTENDEE_NO_SHOW_UPDATED action with per-action versioning
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
    noShowAttendee: BooleanChangeSchema,
});

export class AttendeeNoShowUpdatedAuditActionService implements IAuditActionService {
    readonly VERSION = 1;
    public static readonly TYPE = "ATTENDEE_NO_SHOW_UPDATED" as const;
    private static dataSchemaV1 = z.object({
        version: z.literal(1),
        fields: fieldsSchemaV1,
    });
    private static fieldsSchemaV1 = fieldsSchemaV1;
    public static readonly latestFieldsSchema = fieldsSchemaV1;
    // Union of all versions
    public static readonly storedDataSchema = AttendeeNoShowUpdatedAuditActionService.dataSchemaV1;
    // Union of all versions
    public static readonly storedFieldsSchema = AttendeeNoShowUpdatedAuditActionService.fieldsSchemaV1;
    private helper: AuditActionServiceHelper<
        typeof AttendeeNoShowUpdatedAuditActionService.latestFieldsSchema,
        typeof AttendeeNoShowUpdatedAuditActionService.storedDataSchema
    >;

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: AttendeeNoShowUpdatedAuditActionService.latestFieldsSchema,
            storedDataSchema: AttendeeNoShowUpdatedAuditActionService.storedDataSchema,
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
        return { key: "booking_audit_action.attendee_no_show_updated" };
    }

    getDisplayJson({
        storedData,
    }: GetDisplayJsonParams): AttendeeNoShowUpdatedAuditDisplayData {
        const { fields } = this.parseStored({ version: storedData.version, fields: storedData.fields });
        return {
            noShowAttendee: fields.noShowAttendee.new,
            previousNoShowAttendee: fields.noShowAttendee.old ?? null,
        };
    }
}

export type AttendeeNoShowUpdatedAuditData = z.infer<typeof fieldsSchemaV1>;

export type AttendeeNoShowUpdatedAuditDisplayData = {
    noShowAttendee: boolean;
    previousNoShowAttendee: boolean | null;
};
