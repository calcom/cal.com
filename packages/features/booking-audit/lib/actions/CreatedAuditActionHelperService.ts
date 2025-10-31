import { z } from "zod";
import type { TFunction } from "next-i18next";
import dayjs from "@calcom/dayjs";
import { BookingStatus } from "@calcom/prisma/enums";

/**
 * Created Audit Action Helper Service
 * Handles RECORD_CREATED action
 */
export class CreatedAuditActionHelperService {
    static readonly schema = z.object({
        startTime: z.string(),
        endTime: z.string(),
        status: z.nativeEnum(BookingStatus),
    });

    static createData(params: {
        startTime: string;
        endTime: string;
        status: BookingStatus;
    }): z.infer<typeof this.schema> {
        return params;
    }

    static validate(data: unknown): z.infer<typeof this.schema> {
        return this.schema.parse(data);
    }

    static getDisplaySummary(data: z.infer<typeof this.schema>, t: TFunction): string {
        return t('audit.booking_created');
    }

    static getDisplayDetails(data: z.infer<typeof this.schema>, t: TFunction): Record<string, string> {
        return {
            'Start Time': dayjs(data.startTime).format('MMM D, YYYY h:mm A'),
            'End Time': dayjs(data.endTime).format('MMM D, YYYY h:mm A'),
            'Initial Status': data.status,
        };
    }
}

export type CreatedAuditData = z.infer<typeof CreatedAuditActionHelperService.schema>;

