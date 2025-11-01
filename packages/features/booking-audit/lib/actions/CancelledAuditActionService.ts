import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Cancelled Audit Action Service
 * Handles CANCELLED action
 */
export class CancelledAuditActionService {
    static readonly schema = z.object({
        cancellationReason: z.string(),
    });

    parse(data: unknown): z.infer<typeof CancelledAuditActionService.schema> {
        return CancelledAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof CancelledAuditActionService.schema>, t: TFunction): string {
        return t('audit.cancelled_booking');
    }

    getDisplayDetails(data: z.infer<typeof CancelledAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {
            'Reason': data.cancellationReason,
        };
    }
}

export type CancelledAuditData = z.infer<typeof CancelledAuditActionService.schema>;

