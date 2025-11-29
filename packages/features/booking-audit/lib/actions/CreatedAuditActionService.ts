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
 * 
 * Version History:
 * - v1: Initial schema with startTime, endTime, status
 */

export const createdFieldsSchemaV1 = z.object({
    startTime: z.string(),
    endTime: z.string(),
    status: z.nativeEnum(BookingStatus),
});

// V1 with version wrapper (data schema stored in DB)
export const createdDataSchemaV1 = z.object({
    version: z.literal(1),
    fields: createdFieldsSchemaV1,
});

// Union of all versions (currently just v1)
export const createdDataSchemaAllVersions = createdDataSchemaV1;

// Always points to the latest fields schema
export const createdFieldsSchema = createdFieldsSchemaV1;

export class CreatedAuditActionService implements IAuditActionService<typeof createdFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof createdFieldsSchema, typeof createdDataSchemaAllVersions>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = createdFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: createdFieldsSchema,
            allVersionsDataSchema: createdDataSchemaAllVersions,
        });
    }

    parseFieldsWithLatest(input: unknown) {
        return this.helper.parseFieldsWithLatest(input);
    }

    parseStored(data: unknown) {
        return this.helper.parseStored(data);
    }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
    }

    migrateToLatest(data: unknown) {
        // V1-only: validate and return as-is (no migration needed)
        const validated = this.fieldsSchemaV1.parse(data);
        return { isMigrated: false, latestData: validated };
    }

    getDisplaySummary(storedData: { version: number; fields: z.infer<typeof createdFieldsSchemaV1> }, t: TFunction): string {
        return t('audit.booking_created');
    }

    getDisplayDetails(storedData: { version: number; fields: z.infer<typeof createdFieldsSchemaV1> }, t: TFunction): Record<string, string> {
        const { fields } = storedData;
        return {
            [t('audit.start_time')]: dayjs(fields.startTime).format('MMM D, YYYY h:mm A'),
            [t('audit.end_time')]: dayjs(fields.endTime).format('MMM D, YYYY h:mm A'),
            [t('audit.initial_status')]: fields.status,
        };
    }
}

export type CreatedAuditData = z.infer<typeof createdFieldsSchemaV1>;
