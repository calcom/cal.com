import { z } from "zod";
import type { TFunction } from "next-i18next";
import dayjs from "@calcom/dayjs";

/**
 * Rescheduled Audit Action Service
 * Handles RESCHEDULED action
 */
export class RescheduledAuditActionService {
    static readonly schema = z.object({
        startTime: z.string(),
        endTime: z.string(),
    });

    parse(data: unknown): z.infer<typeof RescheduledAuditActionService.schema> {
        return RescheduledAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof RescheduledAuditActionService.schema>, t: TFunction): string {
        const formattedDate = dayjs(data.startTime).format('MMM D, YYYY');
        return t('audit.rescheduled_to', { date: formattedDate });
    }

    getDisplayDetails(data: z.infer<typeof RescheduledAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {
            'New Start Time': dayjs(data.startTime).format('MMM D, YYYY h:mm A'),
            'New End Time': dayjs(data.endTime).format('MMM D, YYYY h:mm A'),
        };
    }
}

export type RescheduledAuditData = z.infer<typeof RescheduledAuditActionService.schema>;

