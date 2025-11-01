import { z } from "zod";
import type { TFunction } from "next-i18next";

import { ChangeSchema } from "../common/schemas";

/**
 * Attendee Removed Audit Action Service
 * Handles ATTENDEE_REMOVED action
 */
export class AttendeeRemovedAuditActionService {
    static readonly schema = z.object({
        changes: z.array(ChangeSchema),
    });

    parse(data: unknown): z.infer<typeof AttendeeRemovedAuditActionService.schema> {
        return AttendeeRemovedAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof AttendeeRemovedAuditActionService.schema>, t: TFunction): string {
        return t('audit.attendee_removed');
    }

    getDisplayDetails(data: z.infer<typeof AttendeeRemovedAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {};
    }
}

export type AttendeeRemovedAuditData = z.infer<typeof AttendeeRemovedAuditActionService.schema>;

