import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Cancellation Reason Updated Audit Action Service
 * Handles CANCELLATION_REASON_UPDATED action
 */
export class CancellationReasonUpdatedAuditActionService {
    static readonly schema = z.object({
        cancellationReason: z.string(),
    });

    parse(data: unknown): z.infer<typeof CancellationReasonUpdatedAuditActionService.schema> {
        return CancellationReasonUpdatedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof CancellationReasonUpdatedAuditActionService.schema>, t: TFunction): string {
        return t('audit.cancellation_reason_updated');
    }

    getDisplayDetails(data: z.infer<typeof CancellationReasonUpdatedAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {
            'Reason': data.cancellationReason,
        };
    }
}

export type CancellationReasonUpdatedAuditData = z.infer<typeof CancellationReasonUpdatedAuditActionService.schema>;

