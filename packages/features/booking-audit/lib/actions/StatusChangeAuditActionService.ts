import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Status change change schema
 */
const StatusChangeChangeSchema = z.object({
    /** Booking status change */
    status: z.object({
        old: z.string().nullish(),
        new: z.string(),
    }).optional(),

    /** Booking references (calendar/video integrations) */
    references: z.object({
        old: z.array(z.unknown()).nullish(),
        new: z.array(z.unknown()).nullish(),
    }).optional(),
});

export type StatusChangeChange = z.infer<typeof StatusChangeChangeSchema>;

/**
 * Status Change Audit Action Service
 * Handles ACCEPTED, PENDING, AWAITING_HOST actions
 */
export class StatusChangeAuditActionService {
    static readonly schema = z.object({
        changes: StatusChangeChangeSchema.optional(),
    });

    parse(data: unknown): z.infer<typeof StatusChangeAuditActionService.schema> {
        return StatusChangeAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof StatusChangeAuditActionService.schema>, t: TFunction): string {
        return t('audit.status_changed');
    }

    getDisplayDetails(data: z.infer<typeof StatusChangeAuditActionService.schema>, t: TFunction): Record<string, string> {
        const details: Record<string, string> = {};
        if (data.changes?.status) {
            details['Status'] = `${data.changes.status.old ?? '-'} → ${data.changes.status.new}`;
        }
        if (data.changes?.references) {
            const oldCount = data.changes.references.old?.length ?? 0;
            const newCount = data.changes.references.new?.length ?? 0;
            details['References'] = `${oldCount} → ${newCount} integrations`;
        }
        return details;
    }
}

export type StatusChangeAuditData = z.infer<typeof StatusChangeAuditActionService.schema>;

