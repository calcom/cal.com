import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Attendee no-show updated primary schema
 */
const AttendeeNoShowUpdatedPrimarySchema = z.object({
    /** Attendee no-show status */
    noShowAttendee: z.object({
        old: z.boolean().nullable(),
        new: z.boolean(),
    }),
});

export type AttendeeNoShowUpdatedPrimary = z.infer<typeof AttendeeNoShowUpdatedPrimarySchema>;

/**
 * Attendee No-Show Updated Audit Action Service
 * Handles ATTENDEE_NO_SHOW_UPDATED action
 */
export class AttendeeNoShowUpdatedAuditActionService {
    static readonly schema = z.object({
        primary: AttendeeNoShowUpdatedPrimarySchema,
    });

    parse(data: unknown): z.infer<typeof AttendeeNoShowUpdatedAuditActionService.schema> {
        return AttendeeNoShowUpdatedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof AttendeeNoShowUpdatedAuditActionService.schema>, t: TFunction): string {
        return t('audit.attendee_no_show_updated');
    }

    getDisplayDetails(data: z.infer<typeof AttendeeNoShowUpdatedAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {
            'Attendee No-Show': `${data.primary.noShowAttendee.old ?? false} → ${data.primary.noShowAttendee.new}`,
        };
    }
}

export type AttendeeNoShowUpdatedAuditData = z.infer<typeof AttendeeNoShowUpdatedAuditActionService.schema>;

