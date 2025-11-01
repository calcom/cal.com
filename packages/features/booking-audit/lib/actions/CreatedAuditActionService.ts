import { z } from "zod";
import type { TFunction } from "next-i18next";
import dayjs from "@calcom/dayjs";
import { BookingStatus } from "@calcom/prisma/enums";

/**
 * Created Audit Action Service
 * Handles RECORD_CREATED action
 */
export class CreatedAuditActionService {
    static readonly schema = z.object({
        startTime: z.string(),
        endTime: z.string(),
        status: z.nativeEnum(BookingStatus),
    });

    parse(data: unknown): z.infer<typeof CreatedAuditActionService.schema> {
        return CreatedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof CreatedAuditActionService.schema>, t: TFunction): string {
        return t('audit.booking_created');
    }

    getDisplayDetails(data: z.infer<typeof CreatedAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {
            'Start Time': dayjs(data.startTime).format('MMM D, YYYY h:mm A'),
            'End Time': dayjs(data.endTime).format('MMM D, YYYY h:mm A'),
            'Initial Status': data.status,
        };
    }
}

export type CreatedAuditData = z.infer<typeof CreatedAuditActionService.schema>;

