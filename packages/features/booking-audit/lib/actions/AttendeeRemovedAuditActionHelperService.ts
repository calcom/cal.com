import { z } from "zod";
import type { TFunction } from "next-i18next";

import { ChangeSchema } from "../common/schemas";

/**
 * Attendee Removed Audit Action Helper Service
 * Handles ATTENDEE_REMOVED action
 */
export class AttendeeRemovedAuditActionHelperService {
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
        return t('audit.attendee_removed');
    }

    static getDisplayDetails(data: z.infer<typeof this.schema>, t: TFunction): Record<string, string> {
        return {};
    }
}

export type AttendeeRemovedAuditData = z.infer<typeof AttendeeRemovedAuditActionHelperService.schema>;

