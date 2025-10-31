import { z } from "zod";
import type { TFunction } from "next-i18next";

import { ChangeSchema } from "../common/schemas";

/**
 * Attendee No-Show Updated Audit Action Helper Service
 * Handles ATTENDEE_NO_SHOW_UPDATED action
 */
export class AttendeeNoShowUpdatedAuditActionHelperService {
    static readonly schema = z.object({
        changes: z.array(ChangeSchema),
    });

    static createData(params: {
        changes: Array<{ field: string; oldValue?: unknown; newValue?: unknown }>;
    }): z.infer<typeof this.schema> {
        return params;
    }

    static validate(data: unknown): z.infer<typeof this.schema> {
        return this.schema.parse(data);
    }

    static getDisplaySummary(data: z.infer<typeof this.schema>, t: TFunction): string {
        return t('audit.attendee_no_show_updated');
    }

    static getDisplayDetails(data: z.infer<typeof this.schema>, t: TFunction): Record<string, string> {
        return {};
    }
}

export type AttendeeNoShowUpdatedAuditData = z.infer<typeof AttendeeNoShowUpdatedAuditActionHelperService.schema>;

