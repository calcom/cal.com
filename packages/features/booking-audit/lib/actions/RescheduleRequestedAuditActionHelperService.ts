import { z } from "zod";
import type { TFunction } from "next-i18next";

import { ChangeSchema } from "../common/schemas";

/**
 * Reschedule Requested Audit Action Helper Service
 * Handles RESCHEDULE_REQUESTED action
 */
export class RescheduleRequestedAuditActionHelperService {
    static readonly schema = z.object({
        cancellationReason: z.string().optional(),
        changes: z.array(ChangeSchema),
    });

    static createData(params: {
        cancellationReason?: string;
        changes: Array<{ field: string; oldValue?: unknown; newValue?: unknown }>;
    }): z.infer<typeof this.schema> {
        return params;
    }

    static validate(data: unknown): z.infer<typeof this.schema> {
        return this.schema.parse(data);
    }

    static getDisplaySummary(data: z.infer<typeof this.schema>, t: TFunction): string {
        return t('audit.reschedule_requested');
    }

    static getDisplayDetails(data: z.infer<typeof this.schema>, t: TFunction): Record<string, string> {
        const details: Record<string, string> = {};
        if (data.cancellationReason) {
            details['Reason'] = data.cancellationReason;
        }
        return details;
    }
}

export type RescheduleRequestedAuditData = z.infer<typeof RescheduleRequestedAuditActionHelperService.schema>;

