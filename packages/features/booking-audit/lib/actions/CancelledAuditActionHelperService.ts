import { z } from "zod";
import type { TFunction } from "next-i18next";
import dayjs from "@calcom/dayjs";

/**
 * Cancelled Audit Action Helper Service
 * Handles CANCELLED action
 */
export class CancelledAuditActionHelperService {
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
        return t('audit.cancelled_booking');
    }

    static getDisplayDetails(data: z.infer<typeof this.schema>, t: TFunction): Record<string, string> {
        return {
            'Reason': data.cancellationReason,
        };
    }
}

export type CancelledAuditData = z.infer<typeof CancelledAuditActionHelperService.schema>;

