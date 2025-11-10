import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringArrayChangeSchema } from "../common/changeSchemas";

/**
 * Attendee Added Audit Action Service
 * Handles ATTENDEE_ADDED action
 */
export class AttendeeAddedAuditActionService {
    static readonly schema = z.object({
        addedAttendees: StringArrayChangeSchema,
    });

    parse(data: unknown): z.infer<typeof AttendeeAddedAuditActionService.schema> {
        return AttendeeAddedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof AttendeeAddedAuditActionService.schema>, t: TFunction): string {
        return t('audit.added_guests', { count: data.addedAttendees.new.length });
    }

    getDisplayDetails(data: z.infer<typeof AttendeeAddedAuditActionService.schema>, _t: TFunction): Record<string, string> {
        return {
            'Added Guests': data.addedAttendees.new.join(', '),
            'Count': data.addedAttendees.new.length.toString(),
        };
    }
}

export type AttendeeAddedAuditData = z.infer<typeof AttendeeAddedAuditActionService.schema>;

