import { z } from "zod";
import type { TFunction } from "next-i18next";

import { ChangeSchema } from "../common/schemas";

/**
 * Meeting URL Updated Audit Action Helper Service
 * Handles MEETING_URL_UPDATED action
 */
export class MeetingUrlUpdatedAuditActionHelperService {
    static readonly schema = z.object({
        changes: z.array(ChangeSchema),
    });

    static createData(params: {
        changes: Array<{ field: string; oldValue?: unknown; newValue?: unknown }>;
    }): z.infer<typeof this.schema> {
        return params;
    }

    static validate(data: unknown): z.infer<typeof this.schema> {
        return this.schema.parse(data);
    }

    static getDisplaySummary(data: z.infer<typeof this.schema>, t: TFunction): string {
        return t('audit.meeting_url_updated');
    }

    static getDisplayDetails(data: z.infer<typeof this.schema>, t: TFunction): Record<string, string> {
        const urlChange = data.changes.find(c => c.field === 'meetingUrl');
        if (urlChange) {
            return {
                'New Meeting URL': String(urlChange.newValue || '-'),
            };
        }
        return {};
    }
}

export type MeetingUrlUpdatedAuditData = z.infer<typeof MeetingUrlUpdatedAuditActionHelperService.schema>;

