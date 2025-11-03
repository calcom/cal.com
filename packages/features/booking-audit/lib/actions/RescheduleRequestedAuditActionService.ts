import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Reschedule requested change schema
 */
const RescheduleRequestedChangeSchema = z.object({
    /** Rescheduled flag change */
    rescheduled: z.object({
        old: z.boolean().nullish(),
        new: z.boolean(),
    }).optional(),

    /** Who cancelled the booking */
    cancelledBy: z.object({
        old: z.string().nullish(),
        new: z.string().nullish(),
    }).optional(),
});

export type RescheduleRequestedChange = z.infer<typeof RescheduleRequestedChangeSchema>;

/**
 * Reschedule Requested Audit Action Service
 * Handles RESCHEDULE_REQUESTED action
 */
export class RescheduleRequestedAuditActionService {
    static readonly schema = z.object({
        cancellationReason: z.string().optional(),
        changes: RescheduleRequestedChangeSchema,
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
            details['Reason'] = data.cancellationReason;
        }
        if (data.changes.rescheduled) {
            details['Rescheduled'] = `${data.changes.rescheduled.old ?? false} → ${data.changes.rescheduled.new}`;
        }
        if (data.changes.cancelledBy) {
            details['Cancelled By'] = `${data.changes.cancelledBy.old ?? '-'} → ${data.changes.cancelledBy.new ?? '-'}`;
        }
        return details;
    }
}

export type RescheduleRequestedAuditData = z.infer<typeof RescheduleRequestedAuditActionService.schema>;

