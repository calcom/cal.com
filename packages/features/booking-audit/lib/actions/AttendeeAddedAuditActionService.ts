import { z } from "zod";
import type { TFunction } from "next-i18next";

import { ChangeSchema } from "../common/schemas";

/**
 * Attendee Added Audit Action Service
 * Handles ATTENDEE_ADDED action
 */
export class AttendeeAddedAuditActionService {
    static readonly schema = z.object({
        addedGuests: z.array(z.string()),
        changes: z.array(ChangeSchema),
    });

    parse(data: unknown): z.infer<typeof AttendeeAddedAuditActionService.schema> {
        return AttendeeAddedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof AttendeeAddedAuditActionService.schema>, t: TFunction): string {
        return t('audit.added_guests', { count: data.addedGuests.length });
    }

    getDisplayDetails(data: z.infer<typeof AttendeeAddedAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {
            'Added Guests': data.addedGuests.join(', '),
            'Count': data.addedGuests.length.toString(),
        };
    }
}

export type AttendeeAddedAuditData = z.infer<typeof AttendeeAddedAuditActionService.schema>;

