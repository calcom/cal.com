import { z } from "zod";
import type { TFunction } from "next-i18next";

import { ChangeSchema, AssignmentDetailsSchema } from "../common/schemas";

/**
 * Reassignment Audit Action Service
 * Handles REASSIGNMENT action
 */
export class ReassignmentAuditActionService {
    static readonly schema = z.object({
        reassignmentReason: z.string(),
        assignmentMethod: z.enum(['manual', 'round_robin', 'salesforce', 'routing_form', 'crm_ownership']),
        assignmentDetails: AssignmentDetailsSchema,
        changes: z.array(ChangeSchema),
    });

    parse(data: unknown): z.infer<typeof ReassignmentAuditActionService.schema> {
        return ReassignmentAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof ReassignmentAuditActionService.schema>, t: TFunction): string {
        return t('audit.assigned_user', { userName: data.assignmentDetails.assignedUser.name });
    }

    getDisplayDetails(data: z.infer<typeof ReassignmentAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {
            'Type': data.assignmentMethod,
            'From': data.assignmentDetails.previousUser?.name || '-',
            'To': data.assignmentDetails.assignedUser.name,
            'Team': data.assignmentDetails.teamName || '-',
            'Reason': data.reassignmentReason,
        };
    }
}

export type ReassignmentAuditData = z.infer<typeof ReassignmentAuditActionService.schema>;

