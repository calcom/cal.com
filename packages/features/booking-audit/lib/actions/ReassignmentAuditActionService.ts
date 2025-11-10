import { z } from "zod";
import type { TFunction } from "next-i18next";

import { StringChangeSchema, NumberChangeSchema } from "../common/changeSchemas";

/**
 * Reassignment Audit Action Service
 * Handles REASSIGNMENT action
 */
export class ReassignmentAuditActionService {
    static readonly schema = z.object({
        assignedToId: NumberChangeSchema,
        assignedById: NumberChangeSchema,
        reassignmentReason: StringChangeSchema,
        userPrimaryEmail: StringChangeSchema.optional(),
        title: StringChangeSchema.optional(),
    });

    parse(data: unknown): z.infer<typeof ReassignmentAuditActionService.schema> {
        return ReassignmentAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof ReassignmentAuditActionService.schema>, t: TFunction): string {
        return t('audit.booking_reassigned');
    }

    getDisplayDetails(data: z.infer<typeof ReassignmentAuditActionService.schema>, _t: TFunction): Record<string, string> {
        const details: Record<string, string> = {
            'Assigned To ID': `${data.assignedToId.old ?? '-'} → ${data.assignedToId.new}`,
            'Assigned By ID': `${data.assignedById.old ?? '-'} → ${data.assignedById.new}`,
            'Reason': data.reassignmentReason.new ?? '-',
        };

        // Add optional fields if present
        if (data.userPrimaryEmail) {
            details['Email'] = `${data.userPrimaryEmail.old ?? '-'} → ${data.userPrimaryEmail.new ?? '-'}`;
        }
        if (data.title) {
            details['Title'] = `${data.title.old ?? '-'} → ${data.title.new ?? '-'}`;
        }

        return details;
    }
}

export type ReassignmentAuditData = z.infer<typeof ReassignmentAuditActionService.schema>;

