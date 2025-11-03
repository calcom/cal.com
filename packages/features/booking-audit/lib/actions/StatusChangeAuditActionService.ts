import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Status change primary schema
 */
const StatusChangePrimarySchema = z.object({
    /** Booking status change */
    status: z.object({
        old: z.string().nullable(),
        new: z.string(),
    }),
});

/**
 * Status change secondary schema
 */
const StatusChangeSecondarySchema = z.object({
    /** Booking references (calendar/video integrations) */
    references: z.object({
        old: z.array(z.unknown()).nullable(),
        new: z.array(z.unknown()).nullable(),
    }).optional(),
});

export type StatusChangePrimary = z.infer<typeof StatusChangePrimarySchema>;
export type StatusChangeSecondary = z.infer<typeof StatusChangeSecondarySchema>;

/**
 * Status Change Audit Action Service
 * Handles ACCEPTED, PENDING, AWAITING_HOST actions
 */
export class StatusChangeAuditActionService {
    static readonly schema = z.object({
        primary: StatusChangePrimarySchema,
        secondary: StatusChangeSecondarySchema.optional(),
    });

    parse(data: unknown): z.infer<typeof StatusChangeAuditActionService.schema> {
        return StatusChangeAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof StatusChangeAuditActionService.schema>, t: TFunction): string {
        return t('audit.status_changed');
    }

    getDisplayDetails(data: z.infer<typeof StatusChangeAuditActionService.schema>, t: TFunction): Record<string, string> {
        const details: Record<string, string> = {};
        if (data.primary.status) {
            details['Status'] = `${data.primary.status.old ?? '-'} → ${data.primary.status.new}`;
        }
        if (data.secondary?.references) {
            const oldCount = data.secondary.references.old?.length ?? 0;
            const newCount = data.secondary.references.new?.length ?? 0;
            details['References'] = `${oldCount} → ${newCount} integrations`;
        }
        return details;
    }
}

export type StatusChangeAuditData = z.infer<typeof StatusChangeAuditActionService.schema>;

