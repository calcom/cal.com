import { z } from "zod";
import type { TFunction } from "next-i18next";

import { AssignmentDetailsSchema } from "../common/schemas";
import { StringChangeSchema, NumberChangeSchema } from "../common/changeSchemas";

/**
 * Reassignment Audit Action Service
 * Handles REASSIGNMENT action
 */
export class ReassignmentAuditActionService {
    static readonly schema = z.object({
        primary: z.object({
            userId: NumberChangeSchema,
            email: StringChangeSchema,
            reassignmentReason: StringChangeSchema,
        }),
        secondary: z.object({
            userPrimaryEmail: StringChangeSchema.optional(),
            title: StringChangeSchema.optional(),
        }).optional(),
        // Context fields (not changes)
        assignmentMethod: z.enum(['manual', 'round_robin', 'salesforce', 'routing_form', 'crm_ownership']),
        assignmentDetails: AssignmentDetailsSchema,
    });

    parse(data: unknown): z.infer<typeof ReassignmentAuditActionService.schema> {
        return ReassignmentAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof ReassignmentAuditActionService.schema>, t: TFunction): string {
        return t('audit.assigned_user', { userName: data.assignmentDetails.assignedUser.name });
    }

    getDisplayDetails(data: z.infer<typeof ReassignmentAuditActionService.schema>, t: TFunction): Record<string, string> {
        const details: Record<string, string> = {
            'Type': data.assignmentMethod,
            'From': data.assignmentDetails.previousUser?.name || '-',
            'To': data.assignmentDetails.assignedUser.name,
            'Team': data.assignmentDetails.teamName || '-',
            'Reason': data.primary.reassignmentReason.new ?? '-',
        };

        // Add primary field-level changes
        if (data.primary.userId) {
            details['User ID'] = `${data.primary.userId.old ?? '-'} → ${data.primary.userId.new}`;
        }
        if (data.primary.email) {
            details['Email'] = `${data.primary.email.old ?? '-'} → ${data.primary.email.new ?? '-'}`;
        }

        // Add secondary field-level changes if present
        if (data.secondary?.title) {
            details['Title'] = `${data.secondary.title.old ?? '-'} → ${data.secondary.title.new ?? '-'}`;
        }

        return details;
    }
}

export type ReassignmentAuditData = z.infer<typeof ReassignmentAuditActionService.schema>;

