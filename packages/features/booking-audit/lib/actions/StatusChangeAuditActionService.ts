import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema } from "../common/changeSchemas";

/**
 * Status Change Audit Action Service
 * Handles ACCEPTED, PENDING, AWAITING_HOST actions
 */
export class StatusChangeAuditActionService {
    static readonly schema = z.object({
        status: StringChangeSchema,
    });

    parse(data: unknown): z.infer<typeof StatusChangeAuditActionService.schema> {
        return StatusChangeAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof StatusChangeAuditActionService.schema>, t: TFunction): string {
        return t('audit.status_changed');
    }

    getDisplayDetails(data: z.infer<typeof StatusChangeAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {
            'Status': `${data.status.old ?? '-'} → ${data.status.new ?? '-'}`,
        };
    }
}

export type StatusChangeAuditData = z.infer<typeof StatusChangeAuditActionService.schema>;

