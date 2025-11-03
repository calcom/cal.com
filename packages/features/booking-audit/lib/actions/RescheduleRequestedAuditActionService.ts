import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema, BooleanChangeSchema } from "../common/changeSchemas";

/**
 * Reschedule Requested Audit Action Service
 * Handles RESCHEDULE_REQUESTED action
 */
export class RescheduleRequestedAuditActionService {
    static readonly schema = z.object({
        primary: z.object({
            cancellationReason: StringChangeSchema,
            cancelledBy: StringChangeSchema,
        }),
        secondary: z.object({
            rescheduled: BooleanChangeSchema.optional(),
        }).optional(),
    });

    parse(data: unknown): z.infer<typeof RescheduleRequestedAuditActionService.schema> {
        return RescheduleRequestedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof RescheduleRequestedAuditActionService.schema>, t: TFunction): string {
        return t('audit.reschedule_requested');
    }

    getDisplayDetails(data: z.infer<typeof RescheduleRequestedAuditActionService.schema>, t: TFunction): Record<string, string> {
        const details: Record<string, string> = {};
        if (data.primary.cancellationReason) {
            details['Reason'] = data.primary.cancellationReason.new ?? '-';
        }
        if (data.primary.cancelledBy) {
            details['Cancelled By'] = `${data.primary.cancelledBy.old ?? '-'} → ${data.primary.cancelledBy.new ?? '-'}`;
        }
        if (data.secondary?.rescheduled) {
            details['Rescheduled'] = `${data.secondary.rescheduled.old ?? false} → ${data.secondary.rescheduled.new}`;
        }
        return details;
    }
}

export type RescheduleRequestedAuditData = z.infer<typeof RescheduleRequestedAuditActionService.schema>;

