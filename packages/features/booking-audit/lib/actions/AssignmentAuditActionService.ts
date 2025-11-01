import { z } from "zod";
import type { TFunction } from "next-i18next";

import { AssignmentDetailsSchema } from "../common/schemas";

/**
 * Assignment Audit Action Service
 * Handles ASSIGNMENT_REASON_UPDATED action
 */
export class AssignmentAuditActionService {
    static readonly schema = z.object({
        assignmentMethod: z.enum(['manual', 'round_robin', 'salesforce', 'routing_form', 'crm_ownership']),
        assignmentDetails: AssignmentDetailsSchema,
    });

    parse(data: unknown): z.infer<typeof AssignmentAuditActionService.schema> {
        return AssignmentAuditActionService.schema.parse(data);
    }

    getDisplaySummary(data: z.infer<typeof AssignmentAuditActionService.schema>, t: TFunction): string {
        return t('audit.assigned_user', { userName: data.assignmentDetails.assignedUser.name });
    }

    getDisplayDetails(data: z.infer<typeof AssignmentAuditActionService.schema>, t: TFunction): Record<string, string> {
        return {
            'Type': data.assignmentMethod,
            'Assigned To': data.assignmentDetails.assignedUser.name,
            'Team': data.assignmentDetails.teamName || '-',
        };
    }
}

export type AssignmentAuditData = z.infer<typeof AssignmentAuditActionService.schema>;

