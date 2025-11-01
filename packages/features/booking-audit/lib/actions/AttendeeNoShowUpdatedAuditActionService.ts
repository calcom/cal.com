import { z } from "zod";
import type { TFunction } from "next-i18next";

import { ChangeSchema } from "../common/schemas";

/**
 * Attendee No-Show Updated Audit Action Service
 * Handles ATTENDEE_NO_SHOW_UPDATED action
 */
export class AttendeeNoShowUpdatedAuditActionService {
    static readonly schema = z.object({
        changes: z.array(ChangeSchema),
    });

    parse(data: unknown): z.infer<typeof AttendeeNoShowUpdatedAuditActionService.schema> {
        return AttendeeNoShowUpdatedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof AttendeeNoShowUpdatedAuditActionService.schema>, t: TFunction): string {
        return t('audit.attendee_no_show_updated');
    }

    getDisplayDetails(data: z.infer<typeof AttendeeNoShowUpdatedAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {};
    }
}

export type AttendeeNoShowUpdatedAuditData = z.infer<typeof AttendeeNoShowUpdatedAuditActionService.schema>;

