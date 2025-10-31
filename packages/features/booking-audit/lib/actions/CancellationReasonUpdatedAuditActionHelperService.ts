import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Cancellation Reason Updated Audit Action Helper Service
 * Handles CANCELLATION_REASON_UPDATED action
 */
export class CancellationReasonUpdatedAuditActionHelperService {
    static readonly schema = z.object({
        cancellationReason: z.string(),
    });

    static createData(params: {
        cancellationReason: string;
    }): z.infer<typeof this.schema> {
        return params;
    }

    static validate(data: unknown): z.infer<typeof this.schema> {
        return this.schema.parse(data);
    }

    static getDisplaySummary(data: z.infer<typeof this.schema>, t: TFunction): string {
        return t('audit.cancellation_reason_updated');
    }

    static getDisplayDetails(data: z.infer<typeof this.schema>, t: TFunction): Record<string, string> {
        return {
            'Reason': data.cancellationReason,
        };
    }
}

export type CancellationReasonUpdatedAuditData = z.infer<typeof CancellationReasonUpdatedAuditActionHelperService.schema>;

