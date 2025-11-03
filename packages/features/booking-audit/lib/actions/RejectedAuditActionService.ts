import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema } from "../common/changeSchemas";

/**
 * Rejected Audit Action Service
 * Handles REJECTED action
 */
export class RejectedAuditActionService {
    static readonly schema = z.object({
        primary: z.object({
            rejectionReason: StringChangeSchema,
        }),
        secondary: z.object({
            status: StringChangeSchema.optional(),
        }).optional(),
    });

    parse(data: unknown): z.infer<typeof RejectedAuditActionService.schema> {
        return RejectedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof RejectedAuditActionService.schema>, t: TFunction): string {
        return t('audit.rejected_booking');
    }

    getDisplayDetails(data: z.infer<typeof RejectedAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {
            'Rejection Reason': data.primary.rejectionReason.new ?? '-',
            'Previous Reason': data.primary.rejectionReason.old ?? '-',
        };
    }
}

export type RejectedAuditData = z.infer<typeof RejectedAuditActionService.schema>;

