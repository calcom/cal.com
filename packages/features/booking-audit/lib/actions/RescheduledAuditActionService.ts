import { z } from "zod";
import type { TFunction } from "next-i18next";
import dayjs from "@calcom/dayjs";

import { StringChangeSchema } from "../common/changeSchemas";
import type { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Rescheduled Audit Action Service
 * Handles RESCHEDULED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with startTime, endTime
 */

const rescheduledDataSchemaV1 = z.object({
    startTime: StringChangeSchema,
    endTime: StringChangeSchema,
});

export class RescheduledAuditActionService implements IAuditActionService<typeof rescheduledDataSchemaV1> {
    private helper: AuditActionServiceHelper;

    readonly VERSION = 1;
    readonly dataSchemaV1 = rescheduledDataSchemaV1;

    constructor(helper: AuditActionServiceHelper) {
        this.helper = helper;
    }

    get schema() {
        return z.object({
            version: z.literal(this.VERSION),
            data: this.dataSchemaV1,
        });
    }

    parse(input: unknown): { version: number; data: z.infer<typeof rescheduledDataSchemaV1> } {
        return this.helper.parse({
            version: this.VERSION,
            dataSchema: this.dataSchemaV1,
            input,
        }) as { version: number; data: z.infer<typeof rescheduledDataSchemaV1> };
    }

    parseStored(data: unknown): { version: number; data: z.infer<typeof rescheduledDataSchemaV1> } {
        return this.helper.parseStored({
            schema: this.schema,
            data,
        }) as { version: number; data: z.infer<typeof rescheduledDataSchemaV1> };
    }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
    }

    getDisplaySummary(storedData: { version: number; data: z.infer<typeof rescheduledDataSchemaV1> }, t: TFunction): string {
        const { data } = storedData;
        const formattedDate = dayjs(data.startTime.new).format('MMM D, YYYY');
        return t('audit.rescheduled_to', { date: formattedDate });
    }

    getDisplayDetails(storedData: { version: number; data: z.infer<typeof rescheduledDataSchemaV1> }, t: TFunction): Record<string, string> {
        const { data } = storedData;
        return {
            'Previous Start': data.startTime.old ? dayjs(data.startTime.old).format('MMM D, YYYY h:mm A') : '-',
            'New Start': dayjs(data.startTime.new).format('MMM D, YYYY h:mm A'),
            'Previous End': data.endTime.old ? dayjs(data.endTime.old).format('MMM D, YYYY h:mm A') : '-',
            'New End': dayjs(data.endTime.new).format('MMM D, YYYY h:mm A'),
        };
    }
}

export type RescheduledAuditData = z.infer<typeof rescheduledDataSchemaV1>;
