import { z } from "zod";
import { BookingStatus } from "@calcom/prisma/enums";

import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService, TranslationWithParams, GetDisplayTitleParams, GetDisplayJsonParams } from "./IAuditActionService";

/**
 * Created Audit Action Service
 * 
 * Note: CREATED action captures initial state, so it doesn't use { old, new } pattern
 */

// Schema for date range in availability snapshot
const dateRangeSchema = z.object({
    start: z.string(),
    end: z.string(),
});

// Schema for availability snapshot - captures the organizer's availability at booking time
const availabilitySnapshotSchema = z.object({
    dateRanges: z.array(dateRangeSchema),
    oooExcludedDateRanges: z.array(dateRangeSchema),
});

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
    startTime: z.number(),
    endTime: z.number(),
    status: z.nativeEnum(BookingStatus),
});

// V2 adds availability snapshot
const fieldsSchemaV2 = z.object({
    startTime: z.number(),
    endTime: z.number(),
    status: z.nativeEnum(BookingStatus),
    availabilitySnapshot: availabilitySnapshotSchema.nullable().optional(),
});

export class CreatedAuditActionService implements IAuditActionService {
    readonly VERSION = 2;
    public static readonly TYPE = "CREATED" as const;
    private static dataSchemaV2 = z.object({
        version: z.literal(2),
        fields: fieldsSchemaV2,
    });
    private static fieldsSchemaV2 = fieldsSchemaV2;
    public static readonly latestFieldsSchema = fieldsSchemaV2;
    // Use V2 schema as the stored data schema - V1 data is handled in parseStored
    public static readonly storedDataSchema = CreatedAuditActionService.dataSchemaV2;
    public static readonly storedFieldsSchema = CreatedAuditActionService.fieldsSchemaV2;
    private helper: AuditActionServiceHelper<typeof CreatedAuditActionService.latestFieldsSchema, typeof CreatedAuditActionService.storedDataSchema>;

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: CreatedAuditActionService.latestFieldsSchema,
            storedDataSchema: CreatedAuditActionService.storedDataSchema,
        });
    }

    getVersionedData(fields: unknown) {
        return this.helper.getVersionedData(fields);
    }

    parseStored(data: unknown): { version: number; fields: Record<string, unknown> } {
        const dataObj = data as { version?: number; fields?: unknown };
        if (dataObj.version === 1) {
            const v1Fields = fieldsSchemaV1.parse(dataObj.fields);
            return {
                version: 1,
                fields: { ...v1Fields, availabilitySnapshot: null },
            };
        }
        const parsed = this.helper.parseStored(data);
        return {
            version: parsed.version,
            fields: parsed.fields,
        };
    }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
    }

    migrateToLatest(data: unknown) {
        // Try V2 first
        const v2Result = fieldsSchemaV2.safeParse(data);
        if (v2Result.success) {
            return { isMigrated: false, latestData: v2Result.data };
        }

        // Fall back to V1 and migrate
        const v1Result = fieldsSchemaV1.safeParse(data);
        if (v1Result.success) {
            const migrated: z.infer<typeof fieldsSchemaV2> = {
                ...v1Result.data,
                availabilitySnapshot: null,
            };
            return { isMigrated: true, latestData: migrated };
        }

        // If neither works, throw with V2 schema error for better error messages
        const validated = fieldsSchemaV2.parse(data);
        return { isMigrated: false, latestData: validated };
    }

    async getDisplayTitle(_: GetDisplayTitleParams): Promise<TranslationWithParams> {
        return { key: "booking_audit_action.created" };
    }

    getDisplayJson({
        storedData,
        userTimeZone,
    }: GetDisplayJsonParams): CreatedAuditDisplayData {
        const { latestData } = this.migrateToLatest(storedData.fields);
        const fields = latestData as z.infer<typeof fieldsSchemaV2>;
        const timeZone = userTimeZone;

        return {
            startTime: AuditActionServiceHelper.formatDateTimeInTimeZone(fields.startTime, timeZone),
            endTime: AuditActionServiceHelper.formatDateTimeInTimeZone(fields.endTime, timeZone),
            status: fields.status,
        };
    }
}

export type CreatedAuditData = z.infer<typeof fieldsSchemaV2>;

export type AvailabilitySnapshot = z.infer<typeof availabilitySnapshotSchema>;

export type CreatedAuditDisplayData = {
    startTime: string;
    endTime: string;
    status: BookingStatus;
};

