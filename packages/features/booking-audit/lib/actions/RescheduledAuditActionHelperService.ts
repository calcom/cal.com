import { z } from "zod";
import type { TFunction } from "next-i18next";
import dayjs from "@calcom/dayjs";

/**
 * Rescheduled Audit Action Helper Service
 * Handles RESCHEDULED action
 */
export class RescheduledAuditActionHelperService {
    static readonly schema = z.object({
        meetingTime: z.string(),
    });

    static createData(params: {
        meetingTime: string;
    }): z.infer<typeof this.schema> {
        return params;
    }

    static validate(data: unknown): z.infer<typeof this.schema> {
        return this.schema.parse(data);
    }

    static getDisplaySummary(data: z.infer<typeof this.schema>, t: TFunction): string {
        const formattedDate = dayjs(data.meetingTime).format('MMM D, YYYY');
        return t('audit.rescheduled_to', { date: formattedDate });
    }

    static getDisplayDetails(data: z.infer<typeof this.schema>, t: TFunction): Record<string, string> {
        return {
            'New Meeting Time': dayjs(data.meetingTime).format('MMM D, YYYY h:mm A'),
        };
    }
}

export type RescheduledAuditData = z.infer<typeof RescheduledAuditActionHelperService.schema>;

