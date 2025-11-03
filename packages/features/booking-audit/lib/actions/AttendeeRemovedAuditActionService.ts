import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringArrayChangeSchema } from "../common/changeSchemas";

/**
 * Attendee Removed Audit Action Service
 * Handles ATTENDEE_REMOVED action
 */
export class AttendeeRemovedAuditActionService {
    static readonly schema = z.object({
        primary: z.object({
            attendees: StringArrayChangeSchema,
        }),
    });

    parse(data: unknown): z.infer<typeof AttendeeRemovedAuditActionService.schema> {
        return AttendeeRemovedAuditActionService.schema.parse(data);
    }

    /**
     * Helper to extract just the removed guests from the full attendee list
     */
    getRemovedGuests(data: z.infer<typeof AttendeeRemovedAuditActionService.schema>): string[] {
        const newSet = new Set(data.primary.attendees.new);
        return (data.primary.attendees.old ?? []).filter(email => !newSet.has(email));
    }

    getDisplaySummary(data: z.infer<typeof AttendeeRemovedAuditActionService.schema>, t: TFunction): string {
        const removed = this.getRemovedGuests(data);
        return t('audit.removed_guests', { count: removed.length });
    }

    getDisplayDetails(data: z.infer<typeof AttendeeRemovedAuditActionService.schema>, t: TFunction): Record<string, string> {
        const removed = this.getRemovedGuests(data);
        return {
            'Removed Guests': removed.join(', '),
            'Count': removed.length.toString(),
            'Total Before': (data.primary.attendees.old?.length ?? 0).toString(),
            'Total After': data.primary.attendees.new.length.toString(),
        };
    }
}

export type AttendeeRemovedAuditData = z.infer<typeof AttendeeRemovedAuditActionService.schema>;

