import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema, BooleanChangeSchema } from "../common/changeSchemas";
import type { AuditActionServiceHelper } from "./AuditActionServiceHelper";
import type { IAuditActionService } from "./IAuditActionService";

/**
 * Reschedule Requested Audit Action Service
 * Handles RESCHEDULE_REQUESTED action with per-action versioning
 * 
 * Version History:
 * - v1: Initial schema with cancellationReason, cancelledBy, rescheduled
 */

const rescheduleRequestedDataSchemaV1 = z.object({
    cancellationReason: StringChangeSchema,
    cancelledBy: StringChangeSchema,
    rescheduled: BooleanChangeSchema.optional(),
});

export class RescheduleRequestedAuditActionService implements IAuditActionService<typeof rescheduleRequestedDataSchemaV1> {
    private helper: AuditActionServiceHelper;

    readonly VERSION = 1;
    readonly dataSchemaV1 = rescheduleRequestedDataSchemaV1;

    constructor(helper: AuditActionServiceHelper) {
        this.helper = helper;
    }

    get schema() {
        return z.object({
            version: z.literal(this.VERSION),
            data: this.dataSchemaV1,
        });
    }

    parse(input: unknown): { version: number; data: z.infer<typeof rescheduleRequestedDataSchemaV1> } {
        return this.helper.parse({
            version: this.VERSION,
            dataSchema: this.dataSchemaV1,
            input,
        }) as { version: number; data: z.infer<typeof rescheduleRequestedDataSchemaV1> };
    }

    parseStored(data: unknown): { version: number; data: z.infer<typeof rescheduleRequestedDataSchemaV1> } {
        return this.helper.parseStored({
            schema: this.schema,
            data,
        }) as { version: number; data: z.infer<typeof rescheduleRequestedDataSchemaV1> };
    }

    getVersion(data: unknown): number {
        return this.helper.getVersion(data);
    }

    getDisplaySummary(storedData: { version: number; data: z.infer<typeof rescheduleRequestedDataSchemaV1> }, t: TFunction): string {
        return t('audit.reschedule_requested');
    }

    getDisplayDetails(storedData: { version: number; data: z.infer<typeof rescheduleRequestedDataSchemaV1> }, t: TFunction): Record<string, string> {
        const { data } = storedData;
        const details: Record<string, string> = {};
        if (data.cancellationReason) {
            details['Reason'] = data.cancellationReason.new ?? '-';
        }
        if (data.cancelledBy) {
            details['Cancelled By'] = `${data.cancelledBy.old ?? '-'} → ${data.cancelledBy.new ?? '-'}`;
        }
        if (data.rescheduled) {
            details['Rescheduled'] = `${data.rescheduled.old ?? false} → ${data.rescheduled.new}`;
        }
        return details;
    }
}

export type RescheduleRequestedAuditData = z.infer<typeof rescheduleRequestedDataSchemaV1>;
