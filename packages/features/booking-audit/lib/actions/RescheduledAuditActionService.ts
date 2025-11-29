import { z } from "zod";
import type { TFunction } from "next-i18next";
import dayjs from "@calcom/dayjs";

import { StringChangeSchema } from "../common/changeSchemas";
import { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Rescheduled Audit Action Service
 * Handles RESCHEDULED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with startTime, endTime, rescheduledToUid
 */

export const rescheduledFieldsSchemaV1 = z.object({
    startTime: StringChangeSchema,
    endTime: StringChangeSchema,
    rescheduledToUid: StringChangeSchema,
});

// V1 with version wrapper (data schema stored in DB)
export const rescheduledDataSchemaV1 = z.object({
    version: z.literal(1),
    fields: rescheduledFieldsSchemaV1,
});

// Union of all versions (currently just v1)
export const rescheduledDataSchemaAllVersions = rescheduledDataSchemaV1;

// Always points to the latest fields schema
export const rescheduledFieldsSchema = rescheduledFieldsSchemaV1;

export class RescheduledAuditActionService implements IAuditActionService<typeof rescheduledFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof rescheduledFieldsSchema, typeof rescheduledDataSchemaAllVersions>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = rescheduledFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({
            latestVersion: this.VERSION,
            latestFieldsSchema: rescheduledFieldsSchema,
            allVersionsDataSchema: rescheduledDataSchemaAllVersions,
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

    getDisplaySummary(storedData: { version: number; fields: z.infer<typeof rescheduledFieldsSchemaV1> }, t: TFunction): string {
        const { fields } = storedData;
        const formattedDate = dayjs(fields.startTime.new).format('MMM D, YYYY');
        return t('audit.rescheduled_to', { date: formattedDate });
    }

    getDisplayDetails(storedData: { version: number; fields: z.infer<typeof rescheduledFieldsSchemaV1> }, _t: TFunction): Record<string, string> {
        const { fields } = storedData;
        const details: Record<string, string> = {
            'Previous Start': fields.startTime.old ? dayjs(fields.startTime.old).format('MMM D, YYYY h:mm A') : '-',
            'New Start': dayjs(fields.startTime.new).format('MMM D, YYYY h:mm A'),
            'Previous End': fields.endTime.old ? dayjs(fields.endTime.old).format('MMM D, YYYY h:mm A') : '-',
            'New End': dayjs(fields.endTime.new).format('MMM D, YYYY h:mm A'),
            'Rescheduled To Booking': fields.rescheduledToUid.new ? fields.rescheduledToUid.new : '-',
        };

        return details;
    }
}

export type RescheduledAuditData = z.infer<typeof rescheduledFieldsSchemaV1>;
