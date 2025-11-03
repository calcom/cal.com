import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Rejected primary schema
 */
const RejectedPrimarySchema = z.object({
    rejectionReason: z.object({
        old: z.string().nullable(),
        new: z.string(),
    }),
});

/**
 * Rejected secondary schema
 */
const RejectedSecondarySchema = z.object({
    status: z.object({
        old: z.string().nullable(),
        new: z.string(),
    }).optional(),
});

export type RejectedPrimary = z.infer<typeof RejectedPrimarySchema>;
export type RejectedSecondary = z.infer<typeof RejectedSecondarySchema>;

/**
 * Rejected Audit Action Service
 * Handles REJECTED action
 */
export class RejectedAuditActionService {
    static readonly schema = z.object({
        primary: RejectedPrimarySchema,
        secondary: RejectedSecondarySchema.optional(),
    });

    parse(data: unknown): z.infer<typeof RejectedAuditActionService.schema> {
        return RejectedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof RejectedAuditActionService.schema>, t: TFunction): string {
        return t('audit.rejected_booking');
    }

    getDisplayDetails(data: z.infer<typeof RejectedAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {
            'Rejection Reason': data.primary.rejectionReason.new,
            'Previous Reason': data.primary.rejectionReason.old ?? '-',
        };
    }
}

export type RejectedAuditData = z.infer<typeof RejectedAuditActionService.schema>;

