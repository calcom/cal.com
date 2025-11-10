import { z } from "zod";
import type { TFunction } from "next-i18next";
import dayjs from "@calcom/dayjs";

import { StringChangeSchema } from "../common/changeSchemas";

/**
 * Rescheduled Audit Action Service
 * Handles RESCHEDULED action
 */
export class RescheduledAuditActionService {
    static readonly schema = z.object({
        startTime: StringChangeSchema,
        endTime: StringChangeSchema,
    });

    parse(data: unknown): z.infer<typeof RescheduledAuditActionService.schema> {
        return RescheduledAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof RescheduledAuditActionService.schema>, t: TFunction): string {
        const formattedDate = dayjs(data.startTime.new).format('MMM D, YYYY');
        return t('audit.rescheduled_to', { date: formattedDate });
    }

    getDisplayDetails(data: z.infer<typeof RescheduledAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {
            'Previous Start': data.startTime.old ? dayjs(data.startTime.old).format('MMM D, YYYY h:mm A') : '-',
            'New Start': dayjs(data.startTime.new).format('MMM D, YYYY h:mm A'),
            'Previous End': data.endTime.old ? dayjs(data.endTime.old).format('MMM D, YYYY h:mm A') : '-',
            'New End': dayjs(data.endTime.new).format('MMM D, YYYY h:mm A'),
        };
    }
}

export type RescheduledAuditData = z.infer<typeof RescheduledAuditActionService.schema>;

