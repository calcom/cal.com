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

const createdFieldsSchemaV1 = z.object({
    startTime: z.string(),
    endTime: z.string(),
    status: z.nativeEnum(BookingStatus),
});

export class CreatedAuditActionService implements IAuditActionService<typeof createdFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof createdFieldsSchemaV1>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = createdFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({ fieldsSchema: createdFieldsSchemaV1, version: this.VERSION });
    }

    parseFields(input: unknown) {
        return this.helper.parseFields(input);
    }

    parseStored(data: unknown) {
        return this.helper.parseStored(data);
    }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
    }

    getDisplaySummary(storedData: { version: number; fields: z.infer<typeof createdFieldsSchemaV1> }, t: TFunction): string {
        return t('audit.booking_created');
    }

    getDisplayDetails(storedData: { version: number; fields: z.infer<typeof createdFieldsSchemaV1> }, t: TFunction): Record<string, string> {
        const { fields } = storedData;
        return {
            'Start Time': dayjs(fields.startTime).format('MMM D, YYYY h:mm A'),
            'End Time': dayjs(fields.endTime).format('MMM D, YYYY h:mm A'),
            'Initial Status': fields.status,
        };
    }
}

export type CreatedAuditData = z.infer<typeof createdFieldsSchemaV1>;
