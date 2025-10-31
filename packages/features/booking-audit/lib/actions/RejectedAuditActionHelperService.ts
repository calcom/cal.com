import { z } from "zod";
import type { TFunction } from "next-i18next";
import dayjs from "@calcom/dayjs";

/**
 * Rejected Audit Action Helper Service
 * Handles REJECTED action
 */
export class RejectedAuditActionHelperService {
    static readonly schema = z.object({
        rejectionReason: z.string(),
        meetingTime: z.string(),
    });

    static createData(params: {
        rejectionReason: string;
        meetingTime: string;
    }): z.infer<typeof this.schema> {
        return params;
    }

    static validate(data: unknown): z.infer<typeof this.schema> {
        return this.schema.parse(data);
    }

    static getDisplaySummary(data: z.infer<typeof this.schema>, t: TFunction): string {
        return t('audit.rejected_booking');
    }

    static getDisplayDetails(data: z.infer<typeof this.schema>, t: TFunction): Record<string, string> {
        return {
            'Meeting Time': dayjs(data.meetingTime).format('MMM D, YYYY h:mm A'),
            'Reason': data.rejectionReason,
        };
    }
}

export type RejectedAuditData = z.infer<typeof RejectedAuditActionHelperService.schema>;

