import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema } from "../common/changeSchemas";

/**
 * Cancelled Audit Action Service
 * Handles CANCELLED action
 */
export class CancelledAuditActionService {
    static readonly schema = z.object({
        primary: z.object({
            cancellationReason: StringChangeSchema,
            cancelledBy: StringChangeSchema,
        }),
        secondary: z.object({
            status: StringChangeSchema.optional(),
        }).optional(),
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

