import { z } from "zod";
import type { TFunction } from "next-i18next";
import dayjs from "@calcom/dayjs";
import { BookingStatus } from "@calcom/prisma/enums";

import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Created Audit Action Service
 * Handles RECORD_CREATED action with per-action versioning
 * 
 * Note: CREATED action captures initial state, so it doesn't use { old, new } pattern
 */

// Module-level because it is passed to IAuditActionService type outside the class scope
const fieldsSchemaV1 = z.object({
    startTime: z.string(),
    endTime: z.string(),
    status: z.nativeEnum(BookingStatus),
});

export class CreatedAuditActionService implements IAuditActionService<typeof fieldsSchemaV1> {
    readonly VERSION = 1;
    public static readonly TYPE = "CREATED";
    private static dataSchemaV1 = z.object({
        version: z.literal(1),
        fields: fieldsSchemaV1,
    });
    public static readonly latestFieldsSchema = fieldsSchemaV1;
    public static readonly storedDataSchema = CreatedAuditActionService.dataSchemaV1;
    private helper: AuditActionServiceHelper<typeof CreatedAuditActionService.latestFieldsSchema, typeof CreatedAuditActionService.storedDataSchema>;

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: CreatedAuditActionService.latestFieldsSchema,
            storedDataSchema: CreatedAuditActionService.storedDataSchema,
        });
    }

    getVersionedData(input: unknown) {
        return this.helper.getVersionedData(input);
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

    getDisplaySummary(storedData: { version: number; fields: z.infer<typeof fieldsSchemaV1> }, t: TFunction): string {
        return t('audit.booking_created');
    }

    getDisplayDetails(storedData: { version: number; fields: z.infer<typeof fieldsSchemaV1> }, t: TFunction): Record<string, string> {
        const { fields } = storedData;
        return {
            [t('audit.start_time')]: dayjs(fields.startTime).format('MMM D, YYYY h:mm A'),
            [t('audit.end_time')]: dayjs(fields.endTime).format('MMM D, YYYY h:mm A'),
            [t('audit.initial_status')]: fields.status,
        };
    }
}

export type CreatedAuditData = z.infer<typeof fieldsSchemaV1>;

