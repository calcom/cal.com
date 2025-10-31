import { z } from "zod";
import type { TFunction } from "next-i18next";

import { AssignmentDetailsSchema } from "../common/schemas";

/**
 * Assignment Audit Action Helper Service
 * Handles ASSIGNMENT_REASON_UPDATED action
 */
export class AssignmentAuditActionHelperService {
    static readonly schema = z.object({
        assignmentMethod: z.enum(['manual', 'round_robin', 'salesforce', 'routing_form', 'crm_ownership']),
        assignmentDetails: AssignmentDetailsSchema,
    });

    static createData(params: {
        assignmentMethod: 'manual' | 'round_robin' | 'salesforce' | 'routing_form' | 'crm_ownership';
        assignedUser: { id: number; name: string; email: string };
        previousUser?: { id: number; name: string; email: string };
        teamId?: number;
        teamName?: string;
    }): z.infer<typeof this.schema> {
        return {
            assignmentMethod: params.assignmentMethod,
            assignmentDetails: {
                assignedUser: params.assignedUser,
                previousUser: params.previousUser,
                teamId: params.teamId,
                teamName: params.teamName,
            },
        };
    }

    static validate(data: unknown): z.infer<typeof this.schema> {
        return this.schema.parse(data);
    }

    static getDisplaySummary(data: z.infer<typeof this.schema>, t: TFunction): string {
        return t('audit.assigned_user', { userName: data.assignmentDetails.assignedUser.name });
    }

    static getDisplayDetails(data: z.infer<typeof this.schema>, t: TFunction): Record<string, string> {
        return {
            'Type': data.assignmentMethod,
            'Assigned To': data.assignmentDetails.assignedUser.name,
            'Team': data.assignmentDetails.teamName || '-',
        };
    }
}

export type AssignmentAuditData = z.infer<typeof AssignmentAuditActionHelperService.schema>;

