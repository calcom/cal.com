import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Reschedule requested primary schema
 */
const RescheduleRequestedPrimarySchema = z.object({
    cancellationReason: z.object({
        old: z.string().nullable(),
        new: z.string(),
    }),
});

/**
 * Reschedule requested secondary schema
 */
const RescheduleRequestedSecondarySchema = z.object({
    /** Rescheduled flag change */
    rescheduled: z.object({
        old: z.boolean().nullable(),
        new: z.boolean(),
    }).optional(),

    /** Who cancelled the booking */
    cancelledBy: z.object({
        old: z.string().nullable(),
        new: z.string().nullable(),
    }).optional(),
});

export type RescheduleRequestedPrimary = z.infer<typeof RescheduleRequestedPrimarySchema>;
export type RescheduleRequestedSecondary = z.infer<typeof RescheduleRequestedSecondarySchema>;

/**
 * Reschedule Requested Audit Action Service
 * Handles RESCHEDULE_REQUESTED action
 */
export class RescheduleRequestedAuditActionService {
    static readonly schema = z.object({
        primary: RescheduleRequestedPrimarySchema,
        secondary: RescheduleRequestedSecondarySchema.optional(),
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
            details['Reason'] = data.primary.cancellationReason.new;
        }
        if (data.secondary?.rescheduled) {
            details['Rescheduled'] = `${data.secondary.rescheduled.old ?? false} → ${data.secondary.rescheduled.new}`;
        }
        if (data.secondary?.cancelledBy) {
            details['Cancelled By'] = `${data.secondary.cancelledBy.old ?? '-'} → ${data.secondary.cancelledBy.new ?? '-'}`;
        }
        return details;
    }
}

export type RescheduleRequestedAuditData = z.infer<typeof RescheduleRequestedAuditActionService.schema>;

