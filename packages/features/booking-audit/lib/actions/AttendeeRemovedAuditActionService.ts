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
            removedAttendees: StringArrayChangeSchema,
        }),
    });

    parse(data: unknown): z.infer<typeof AttendeeRemovedAuditActionService.schema> {
        return AttendeeRemovedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof AttendeeRemovedAuditActionService.schema>, t: TFunction): string {
        return t('audit.removed_guests', { count: data.primary.removedAttendees.new.length });
    }

    getDisplayDetails(data: z.infer<typeof AttendeeRemovedAuditActionService.schema>, _t: TFunction): Record<string, string> {
        return {
            'Removed Guests': data.primary.removedAttendees.new.join(', '),
            'Count': data.primary.removedAttendees.new.length.toString(),
        };
    }
}

export type AttendeeRemovedAuditData = z.infer<typeof AttendeeRemovedAuditActionService.schema>;

