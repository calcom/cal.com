import { z } from "zod";
import type { TFunction } from "next-i18next";

import { ChangeSchema } from "../common/schemas";

/**
 * Meeting URL Updated Audit Action Service
 * Handles MEETING_URL_UPDATED action
 */
export class MeetingUrlUpdatedAuditActionService {
    static readonly schema = z.object({
        changes: z.array(ChangeSchema),
    });

    parse(data: unknown): z.infer<typeof MeetingUrlUpdatedAuditActionService.schema> {
        return MeetingUrlUpdatedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof MeetingUrlUpdatedAuditActionService.schema>, t: TFunction): string {
        return t('audit.meeting_url_updated');
    }

    getDisplayDetails(data: z.infer<typeof MeetingUrlUpdatedAuditActionService.schema>, t: TFunction): Record<string, string> {
        const urlChange = data.changes.find(c => c.field === 'meetingUrl');
        if (urlChange) {
            return {
                'New Meeting URL': String(urlChange.newValue || '-'),
            };
        }
        return {};
    }
}

export type MeetingUrlUpdatedAuditData = z.infer<typeof MeetingUrlUpdatedAuditActionService.schema>;

