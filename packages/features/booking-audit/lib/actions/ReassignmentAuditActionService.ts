import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema, NumberChangeSchema } from "../common/changeSchemas";

/**
 * Reassignment Audit Action Service
 * Handles REASSIGNMENT action
 */
export class ReassignmentAuditActionService {
    static readonly schema = z.object({
        primary: z.object({
            assignedToId: NumberChangeSchema,
            assignedById: NumberChangeSchema,
            reassignmentReason: StringChangeSchema,
        }),
        secondary: z.object({
            userPrimaryEmail: StringChangeSchema.optional(),
            title: StringChangeSchema.optional(),
        }).optional(),
    });

    parse(data: unknown): z.infer<typeof ReassignmentAuditActionService.schema> {
        return ReassignmentAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof ReassignmentAuditActionService.schema>, t: TFunction): string {
        return t('audit.booking_reassigned');
    }

    getDisplayDetails(data: z.infer<typeof ReassignmentAuditActionService.schema>, _t: TFunction): Record<string, string> {
        const details: Record<string, string> = {
            'Assigned To ID': `${data.primary.assignedToId.old ?? '-'} → ${data.primary.assignedToId.new}`,
            'Assigned By ID': `${data.primary.assignedById.old ?? '-'} → ${data.primary.assignedById.new}`,
            'Reason': data.primary.reassignmentReason.new ?? '-',
        };

        // Add secondary field-level changes if present
        if (data.secondary?.userPrimaryEmail) {
            details['Email'] = `${data.secondary.userPrimaryEmail.old ?? '-'} → ${data.secondary.userPrimaryEmail.new ?? '-'}`;
        }
        if (data.secondary?.title) {
            details['Title'] = `${data.secondary.title.old ?? '-'} → ${data.secondary.title.new ?? '-'}`;
        }

        return details;
    }
}

export type ReassignmentAuditData = z.infer<typeof ReassignmentAuditActionService.schema>;

