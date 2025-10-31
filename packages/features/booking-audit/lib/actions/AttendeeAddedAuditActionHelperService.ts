import { z } from "zod";
import type { TFunction } from "next-i18next";

import { ChangeSchema } from "../common/schemas";

/**
 * Attendee Added Audit Action Helper Service
 * Handles ATTENDEE_ADDED action
 */
export class AttendeeAddedAuditActionHelperService {
    static readonly schema = z.object({
        addedGuests: z.array(z.string()),
        changes: z.array(ChangeSchema),
    });

    static createData(params: {
        addedGuests: string[];
        changes: Array<{ field: string; oldValue?: unknown; newValue?: unknown }>;
    }): z.infer<typeof this.schema> {
        return params;
    }

    static validate(data: unknown): z.infer<typeof this.schema> {
        return this.schema.parse(data);
    }

    static getDisplaySummary(data: z.infer<typeof this.schema>, t: TFunction): string {
        return t('audit.added_guests', { count: data.addedGuests.length });
    }

    static getDisplayDetails(data: z.infer<typeof this.schema>, t: TFunction): Record<string, string> {
        return {
            'Added Guests': data.addedGuests.join(', '),
            'Count': data.addedGuests.length.toString(),
        };
    }
}

export type AttendeeAddedAuditData = z.infer<typeof AttendeeAddedAuditActionHelperService.schema>;

