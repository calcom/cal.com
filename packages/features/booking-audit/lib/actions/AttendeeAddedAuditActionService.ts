import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringArrayChangeSchema } from "../common/changeSchemas";

/**
 * Attendee Added Audit Action Service
 * Handles ATTENDEE_ADDED action
 */
export class AttendeeAddedAuditActionService {
    static readonly schema = z.object({
        primary: z.object({
            attendees: StringArrayChangeSchema,
        }),
    });

    parse(data: unknown): z.infer<typeof AttendeeAddedAuditActionService.schema> {
        return AttendeeAddedAuditActionService.schema.parse(data);
    }

    /**
     * Helper to extract just the added guests from the full attendee list
     */
    getAddedGuests(data: z.infer<typeof AttendeeAddedAuditActionService.schema>): string[] {
        const oldSet = new Set(data.primary.attendees.old ?? []);
        return data.primary.attendees.new.filter(email => !oldSet.has(email));
    }

    getDisplaySummary(data: z.infer<typeof AttendeeAddedAuditActionService.schema>, t: TFunction): string {
        const added = this.getAddedGuests(data);
        return t('audit.added_guests', { count: added.length });
    }

    getDisplayDetails(data: z.infer<typeof AttendeeAddedAuditActionService.schema>, t: TFunction): Record<string, string> {
        const added = this.getAddedGuests(data);
        return {
            'Added Guests': added.join(', '),
            'Count': added.length.toString(),
            'Total Before': (data.primary.attendees.old?.length ?? 0).toString(),
            'Total After': data.primary.attendees.new.length.toString(),
        };
    }
}

export type AttendeeAddedAuditData = z.infer<typeof AttendeeAddedAuditActionService.schema>;

