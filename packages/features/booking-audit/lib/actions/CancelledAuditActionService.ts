import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Cancelled primary schema
 */
const CancelledPrimarySchema = z.object({
    cancellationReason: z.object({
        old: z.string().nullable(),
        new: z.string().nullable(),
    }),
    
    /** Who cancelled the booking */
    cancelledBy: z.object({
        old: z.string().nullable(),
        new: z.string().nullable(),
    }),
});

/**
 * Cancelled secondary schema
 */
const CancelledSecondarySchema = z.object({
    status: z.object({
        old: z.string().nullable(),
        new: z.string(),
    }).optional(),
});

export type CancelledPrimary = z.infer<typeof CancelledPrimarySchema>;
export type CancelledSecondary = z.infer<typeof CancelledSecondarySchema>;

/**
 * Cancelled Audit Action Service
 * Handles CANCELLED action
 */
export class CancelledAuditActionService {
    static readonly schema = z.object({
        primary: CancelledPrimarySchema,
        secondary: CancelledSecondarySchema.optional(),
    });

    parse(data: unknown): z.infer<typeof CancelledAuditActionService.schema> {
        return CancelledAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof CancelledAuditActionService.schema>, t: TFunction): string {
        return t('audit.cancelled_booking');
    }

    getDisplayDetails(data: z.infer<typeof CancelledAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {
            'Cancellation Reason': data.primary.cancellationReason.new ?? '-',
            'Previous Reason': data.primary.cancellationReason.old ?? '-',
            'Cancelled By': `${data.primary.cancelledBy.old ?? '-'} → ${data.primary.cancelledBy.new ?? '-'}`,
        };
    }
}

export type CancelledAuditData = z.infer<typeof CancelledAuditActionService.schema>;

