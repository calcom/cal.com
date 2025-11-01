import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Rejected Audit Action Service
 * Handles REJECTED action
 */
export class RejectedAuditActionService {
    static readonly schema = z.object({
        rejectionReason: z.string(),
    });

    parse(data: unknown): z.infer<typeof RejectedAuditActionService.schema> {
        return RejectedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof RejectedAuditActionService.schema>, t: TFunction): string {
        return t('audit.rejected_booking');
    }

    getDisplayDetails(data: z.infer<typeof RejectedAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {
            'Reason': data.rejectionReason,
        };
    }
}

export type RejectedAuditData = z.infer<typeof RejectedAuditActionService.schema>;

