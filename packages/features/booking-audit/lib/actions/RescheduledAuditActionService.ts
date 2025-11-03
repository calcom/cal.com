import { z } from "zod";
import type { TFunction } from "next-i18next";
import dayjs from "@calcom/dayjs";

/**
 * Rescheduled primary schema
 */
const RescheduledPrimarySchema = z.object({
    startTime: z.object({
        old: z.string().nullable(),
        new: z.string(),
    }),
    endTime: z.object({
        old: z.string().nullable(),
        new: z.string(),
    }),
});

export type RescheduledPrimary = z.infer<typeof RescheduledPrimarySchema>;

/**
 * Rescheduled Audit Action Service
 * Handles RESCHEDULED action
 */
export class RescheduledAuditActionService {
    static readonly schema = z.object({
        primary: RescheduledPrimarySchema,
    });

    parse(data: unknown): z.infer<typeof RescheduledAuditActionService.schema> {
        return RescheduledAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof RescheduledAuditActionService.schema>, t: TFunction): string {
        const formattedDate = dayjs(data.primary.startTime.new).format('MMM D, YYYY');
        return t('audit.rescheduled_to', { date: formattedDate });
    }

    getDisplayDetails(data: z.infer<typeof RescheduledAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {
            'Previous Start': data.primary.startTime.old ? dayjs(data.primary.startTime.old).format('MMM D, YYYY h:mm A') : '-',
            'New Start': dayjs(data.primary.startTime.new).format('MMM D, YYYY h:mm A'),
            'Previous End': data.primary.endTime.old ? dayjs(data.primary.endTime.old).format('MMM D, YYYY h:mm A') : '-',
            'New End': dayjs(data.primary.endTime.new).format('MMM D, YYYY h:mm A'),
        };
    }
}

export type RescheduledAuditData = z.infer<typeof RescheduledAuditActionService.schema>;

