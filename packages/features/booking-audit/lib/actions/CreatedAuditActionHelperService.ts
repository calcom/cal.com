import { z } from "zod";
import type { TFunction } from "next-i18next";
import dayjs from "@calcom/dayjs";

/**
 * Created Audit Action Helper Service
 * Handles RECORD_CREATED action
 */
export class CreatedAuditActionHelperService {
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
        return t('audit.booking_created');
    }

    static getDisplayDetails(data: z.infer<typeof this.schema>, t: TFunction): Record<string, string> {
        return {
            'Meeting Time': dayjs(data.meetingTime).format('MMM D, YYYY h:mm A'),
        };
    }
}

export type CreatedAuditData = z.infer<typeof CreatedAuditActionHelperService.schema>;

