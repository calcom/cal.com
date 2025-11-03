import { z } from "zod";
import type { TFunction } from "next-i18next";

import { AssignmentDetailsSchema } from "../common/schemas";

/**
 * Reassignment change schema
 */
const ReassignmentChangeSchema = z.object({
    /** User ID being reassigned */
    userId: z.object({
        old: z.union([z.string(), z.number()]).nullish(),
        new: z.union([z.string(), z.number()]),
    }).optional(),

    /** User email being reassigned */
    email: z.object({
        old: z.string().nullish(),
        new: z.string(),
    }).optional(),

    /** User primary email being reassigned */
    userPrimaryEmail: z.object({
        old: z.string().nullish(),
        new: z.string(),
    }).optional(),

    /** Booking title change during reassignment */
    title: z.object({
        old: z.string().nullish(),
        new: z.string(),
    }).optional(),
});

export type ReassignmentChange = z.infer<typeof ReassignmentChangeSchema>;

/**
 * Reassignment Audit Action Service
 * Handles REASSIGNMENT action
 */
export class ReassignmentAuditActionService {
    static readonly schema = z.object({
        reassignmentReason: z.string(),
        assignmentMethod: z.enum(['manual', 'round_robin', 'salesforce', 'routing_form', 'crm_ownership']),
        assignmentDetails: AssignmentDetailsSchema,
        changes: ReassignmentChangeSchema,
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
            'Reason': data.reassignmentReason,
        };

        // Add field-level changes if present
        if (data.changes.userId) {
            details['User ID'] = `${data.changes.userId.old ?? '-'} → ${data.changes.userId.new}`;
        }
        if (data.changes.email) {
            details['Email'] = `${data.changes.email.old ?? '-'} → ${data.changes.email.new}`;
        }
        if (data.changes.title) {
            details['Title'] = `${data.changes.title.old ?? '-'} → ${data.changes.title.new}`;
        }

        return details;
    }
}

export type ReassignmentAuditData = z.infer<typeof ReassignmentAuditActionService.schema>;

