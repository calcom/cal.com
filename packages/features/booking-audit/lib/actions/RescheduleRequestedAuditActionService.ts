import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema, BooleanChangeSchema } from "../common/changeSchemas";

/**
 * Reschedule Requested Audit Action Service
 * Handles RESCHEDULE_REQUESTED action
 */
export class RescheduleRequestedAuditActionService {
    static readonly schema = z.object({
        cancellationReason: StringChangeSchema,
        cancelledBy: StringChangeSchema,
        rescheduled: BooleanChangeSchema.optional(),
    });

    parse(data: unknown): z.infer<typeof RescheduleRequestedAuditActionService.schema> {
        return RescheduleRequestedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof RescheduleRequestedAuditActionService.schema>, t: TFunction): string {
        return t('audit.reschedule_requested');
    }

    getDisplayDetails(data: z.infer<typeof RescheduleRequestedAuditActionService.schema>, t: TFunction): Record<string, string> {
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

export type RescheduleRequestedAuditData = z.infer<typeof RescheduleRequestedAuditActionService.schema>;

