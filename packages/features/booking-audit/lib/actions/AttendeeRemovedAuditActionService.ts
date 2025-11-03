import { z } from "zod";
import type { TFunction } from "next-i18next";

/**
 * Attendee removed change schema
 */
const AttendeeRemovedChangeSchema = z.object({
    /** Attendees list change */
    attendees: z.object({
        old: z.array(z.string()).nullish(),
        new: z.array(z.string()),
    }),
});

export type AttendeeRemovedChange = z.infer<typeof AttendeeRemovedChangeSchema>;

/**
 * Attendee Removed Audit Action Service
 * Handles ATTENDEE_REMOVED action
 */
export class AttendeeRemovedAuditActionService {
    static readonly schema = z.object({
        changes: AttendeeRemovedChangeSchema,
    });

    parse(data: unknown): z.infer<typeof AttendeeRemovedAuditActionService.schema> {
        return AttendeeRemovedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof AttendeeRemovedAuditActionService.schema>, t: TFunction): string {
        return t('audit.attendee_removed');
    }

    getDisplayDetails(data: z.infer<typeof AttendeeRemovedAuditActionService.schema>, t: TFunction): Record<string, string> {
        const oldCount = data.changes.attendees.old?.length ?? 0;
        const newCount = data.changes.attendees.new.length;
        return {
            'Attendees Change': `${oldCount} → ${newCount} attendees`,
        };
    }
}

export type AttendeeRemovedAuditData = z.infer<typeof AttendeeRemovedAuditActionService.schema>;

