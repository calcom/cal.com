import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Attendee no-show updated change schema
 */
const AttendeeNoShowUpdatedChangeSchema = z.object({
    /** Attendee no-show status */
    noShowAttendee: z.object({
        old: z.boolean().nullish(),
        new: z.boolean(),
    }),
});

export type AttendeeNoShowUpdatedChange = z.infer<typeof AttendeeNoShowUpdatedChangeSchema>;

/**
 * Attendee No-Show Updated Audit Action Service
 * Handles ATTENDEE_NO_SHOW_UPDATED action
 */
export class AttendeeNoShowUpdatedAuditActionService {
    static readonly schema = z.object({
        changes: AttendeeNoShowUpdatedChangeSchema,
    });

    parse(data: unknown): z.infer<typeof AttendeeNoShowUpdatedAuditActionService.schema> {
        return AttendeeNoShowUpdatedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof AttendeeNoShowUpdatedAuditActionService.schema>, t: TFunction): string {
        return t('audit.attendee_no_show_updated');
    }

    getDisplayDetails(data: z.infer<typeof AttendeeNoShowUpdatedAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {
            'Attendee No-Show': `${data.changes.noShowAttendee.old ?? false} → ${data.changes.noShowAttendee.new}`,
        };
    }
}

export type AttendeeNoShowUpdatedAuditData = z.infer<typeof AttendeeNoShowUpdatedAuditActionService.schema>;

