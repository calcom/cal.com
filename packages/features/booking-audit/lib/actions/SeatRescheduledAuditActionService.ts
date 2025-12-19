import { z } from "zod";

import { StringChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService, GetDisplayTitleParams, GetDisplayJsonParams, TranslationWithParams } from "./IAuditActionService";
/**
 * Seat Rescheduled Audit Action Service
 * Handles SEAT_RESCHEDULED action with per-action versioning
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
    seatReferenceUid: z.string(),
    attendeeEmail: z.string(),
    startTime: StringChangeSchema,
    endTime: StringChangeSchema,
    rescheduledToBookingUid: StringChangeSchema,
});

export class SeatRescheduledAuditActionService implements IAuditActionService {
    readonly VERSION = 1;
    public static readonly TYPE = "SEAT_RESCHEDULED" as const;
    private static dataSchemaV1 = z.object({
        version: z.literal(1),
        fields: fieldsSchemaV1,
    });
    private static fieldsSchemaV1 = fieldsSchemaV1;
    public static readonly latestFieldsSchema = fieldsSchemaV1;
    // Union of all versions
    public static readonly storedDataSchema = SeatRescheduledAuditActionService.dataSchemaV1;
    // Union of all versions
    public static readonly storedFieldsSchema = SeatRescheduledAuditActionService.fieldsSchemaV1;
    private helper: AuditActionServiceHelper<
        typeof SeatRescheduledAuditActionService.latestFieldsSchema,
        typeof SeatRescheduledAuditActionService.storedDataSchema
    >;

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: SeatRescheduledAuditActionService.latestFieldsSchema,
            storedDataSchema: SeatRescheduledAuditActionService.storedDataSchema,
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
        const rescheduledToBookingUid = fields.rescheduledToBookingUid.new;

        // Format dates in user timezone
        const oldDate = fields.startTime.old
            ? AuditActionServiceHelper.formatDateInTimeZone(fields.startTime.old, userTimeZone)
            : "";
        const newDate = fields.startTime.new
            ? AuditActionServiceHelper.formatDateInTimeZone(fields.startTime.new, userTimeZone)
            : "";

        return {
            key: "booking_audit_action.seat_rescheduled",
            params: {
                oldDate,
                newDate,
            },
            components: rescheduledToBookingUid ? [{ type: "link", href: `/booking/${rescheduledToBookingUid}/logs` }] : undefined,
        };
    }

    getDisplayJson({
        storedData,
        userTimeZone,
    }: GetDisplayJsonParams): SeatRescheduledAuditDisplayData {
        const { fields } = this.parseStored(storedData);

        return {
            seatReferenceUid: fields.seatReferenceUid,
            attendeeEmail: fields.attendeeEmail,
            previousStartTime: fields.startTime.old
                ? AuditActionServiceHelper.formatDateTimeInTimeZone(fields.startTime.old, userTimeZone)
                : null,
            newStartTime: fields.startTime.new
                ? AuditActionServiceHelper.formatDateTimeInTimeZone(fields.startTime.new, userTimeZone)
                : null,
            previousEndTime: fields.endTime.old
                ? AuditActionServiceHelper.formatDateTimeInTimeZone(fields.endTime.old, userTimeZone)
                : null,
            newEndTime: fields.endTime.new
                ? AuditActionServiceHelper.formatDateTimeInTimeZone(fields.endTime.new, userTimeZone)
                : null,
            rescheduledToBookingUid: fields.rescheduledToBookingUid.new ?? null,
        };
    }
}

export type SeatRescheduledAuditData = z.infer<typeof fieldsSchemaV1>;

export type SeatRescheduledAuditDisplayData = {
    seatReferenceUid: string;
    attendeeEmail: string;
    previousStartTime: string | null;
    newStartTime: string | null;
    previousEndTime: string | null;
    newEndTime: string | null;
    rescheduledToBookingUid: string | null;
};
