import { z } from "zod";
import type { TFunction } from "next-i18next";

import { ChangeSchema, AssignmentDetailsSchema } from "../common/schemas";

/**
 * Reassignment Audit Action Helper Service
 * Handles REASSIGNMENT_REASON_UPDATED action
 */
export class ReassignmentAuditActionHelperService {
    static readonly schema = z.object({
        reassignmentReason: z.string(),
        assignmentMethod: z.enum(['manual', 'round_robin', 'salesforce', 'routing_form', 'crm_ownership']),
        assignmentDetails: AssignmentDetailsSchema,
        changes: z.array(ChangeSchema),
    });

    static createData(params: {
        reassignmentReason: string;
        assignmentMethod: 'manual' | 'round_robin' | 'salesforce' | 'routing_form' | 'crm_ownership';
        assignedUser: { id: number; name: string; email: string };
        previousUser: { id: number; name: string; email: string };
        teamId?: number;
        teamName?: string;
        userIdChange: { oldValue: number | null; newValue: number };
        emailChange: { oldValue: string | null; newValue: string };
    }): z.infer<typeof this.schema> {
        return {
            reassignmentReason: params.reassignmentReason,
            assignmentMethod: params.assignmentMethod,
            assignmentDetails: {
                assignedUser: params.assignedUser,
                previousUser: params.previousUser,
                teamId: params.teamId,
                teamName: params.teamName,
            },
            changes: [
                { field: "userId", oldValue: params.userIdChange.oldValue, newValue: params.userIdChange.newValue },
                { field: "userPrimaryEmail", oldValue: params.emailChange.oldValue, newValue: params.emailChange.newValue },
            ],
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
            'From': data.assignmentDetails.previousUser?.name || '-',
            'To': data.assignmentDetails.assignedUser.name,
            'Team': data.assignmentDetails.teamName || '-',
            'Reason': data.reassignmentReason,
        };
    }
}

export type ReassignmentAuditData = z.infer<typeof ReassignmentAuditActionHelperService.schema>;

