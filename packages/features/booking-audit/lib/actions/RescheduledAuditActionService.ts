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
 * - v1: Initial schema with startTime, endTime
 */

const rescheduledFieldsSchemaV1 = z.object({
    startTime: StringChangeSchema,
    endTime: StringChangeSchema,
    previousBookingUid: z.string().optional(),
});

export class RescheduledAuditActionService implements IAuditActionService<typeof rescheduledFieldsSchemaV1> {
    private helper: AuditActionServiceHelper<typeof rescheduledFieldsSchemaV1>;

    readonly VERSION = 1;
    readonly fieldsSchemaV1 = rescheduledFieldsSchemaV1;
    readonly dataSchema = z.object({
        version: z.literal(this.VERSION),
        fields: this.fieldsSchemaV1,
    });

    constructor() {
        this.helper = new AuditActionServiceHelper({ fieldsSchema: rescheduledFieldsSchemaV1, version: this.VERSION });
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

    getDisplaySummary(storedData: { version: number; fields: z.infer<typeof rescheduledFieldsSchemaV1> }, t: TFunction): string {
        const { fields } = storedData;
        const formattedDate = dayjs(fields.startTime.new).format('MMM D, YYYY');
        return t('audit.rescheduled_to', { date: formattedDate });
    }

    getDisplayDetails(storedData: { version: number; fields: z.infer<typeof rescheduledFieldsSchemaV1> }, _t: TFunction): Record<string, string> {
        const { fields } = storedData;
        return {
            'Previous Start': fields.startTime.old ? dayjs(fields.startTime.old).format('MMM D, YYYY h:mm A') : '-',
            'New Start': dayjs(fields.startTime.new).format('MMM D, YYYY h:mm A'),
            'Previous End': fields.endTime.old ? dayjs(fields.endTime.old).format('MMM D, YYYY h:mm A') : '-',
            'New End': dayjs(fields.endTime.new).format('MMM D, YYYY h:mm A'),
        };
    }
}

export type RescheduledAuditData = z.infer<typeof rescheduledFieldsSchemaV1>;
