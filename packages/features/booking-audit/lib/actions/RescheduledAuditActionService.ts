import { z } from "zod";

import { StringChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService, TranslationWithParams, GetDisplayTitleParams, GetDisplayJsonParams, BaseStoredAuditData } from "./IAuditActionService";

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

export class RescheduledAuditActionService implements IAuditActionService {
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

    async getDisplayTitle({
        storedData,
        userTimeZone,
    }: GetDisplayTitleParams): Promise<TranslationWithParams> {
        const { fields } = this.parseStored(storedData);
        const rescheduledToUid = fields.rescheduledToUid.new;
        const timeZone = userTimeZone;

        // Format dates in user timezone
        const oldDate = fields.startTime.old
            ? AuditActionServiceHelper.formatDateInTimeZone(fields.startTime.old, timeZone)
            : "";
        const newDate = fields.startTime.new
            ? AuditActionServiceHelper.formatDateInTimeZone(fields.startTime.new, timeZone)
            : "";

        return {
            key: "booking_audit_action.rescheduled",
            params: {
                oldDate,
                newDate,
            },
            components: rescheduledToUid ? [{ type: "link", href: `/booking/${rescheduledToUid}/logs` }] : undefined,
        };
    }

    getDisplayTitleForRescheduledFromLog({
        fromRescheduleUid,
        userTimeZone,
        storedData,
    }: {
        fromRescheduleUid: string;
        userTimeZone: string;
        storedData: BaseStoredAuditData;
    }): TranslationWithParams {
        const timeZone = userTimeZone;
        const { fields } = this.parseStored(storedData);

        // Format dates in user timezone
        const oldDate = fields.startTime.old
            ? AuditActionServiceHelper.formatDateInTimeZone(fields.startTime.old, timeZone)
            : "";
        const newDate = fields.startTime.new
            ? AuditActionServiceHelper.formatDateInTimeZone(fields.startTime.new, timeZone)
            : "";

        return {
            key: "booking_audit_action.rescheduled_from",
            params: {
                oldDate,
                newDate,
            },
            components: [{ type: "link", href: `/booking/${fromRescheduleUid}/logs` }],
        };
    }

    getDisplayJson({
        storedData,
        userTimeZone,
    }: GetDisplayJsonParams): RescheduledAuditDisplayData {
        const { fields } = this.parseStored({ version: storedData.version, fields: storedData.fields });
        const timeZone = userTimeZone;

        return {
            previousStartTime: fields.startTime.old
                ? AuditActionServiceHelper.formatDateTimeInTimeZone(fields.startTime.old, timeZone)
                : null,
            newStartTime: fields.startTime.new
                ? AuditActionServiceHelper.formatDateTimeInTimeZone(fields.startTime.new, timeZone)
                : null,
            previousEndTime: fields.endTime.old
                ? AuditActionServiceHelper.formatDateTimeInTimeZone(fields.endTime.old, timeZone)
                : null,
            newEndTime: fields.endTime.new
                ? AuditActionServiceHelper.formatDateTimeInTimeZone(fields.endTime.new, timeZone)
                : null,
            rescheduledToUid: fields.rescheduledToUid.new ?? null,
        };
    }

    /**
     * Finds the rescheduled log that created a specific booking
     * by matching the rescheduledToUid field with the target booking UID
     * @param rescheduledLogs - Array of rescheduled audit logs to search through
     * @param rescheduledToBookingUid - The UID of the booking that was created from the reschedule
     * @returns The matching log or null if not found
     */
    getMatchingLog<T extends { data: unknown }>({
        rescheduledLogs,
        rescheduledToBookingUid,
    }: {
        rescheduledLogs: T[];
        rescheduledToBookingUid: string;
    }): T | null {
        return rescheduledLogs.find((log) => {
            const parsedData = this.parseStored(log.data);
            return parsedData.fields.rescheduledToUid.new === rescheduledToBookingUid;
        }) ?? null;
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
