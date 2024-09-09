import type { Workflow } from "./types";
export declare const workflowSelect: {
    id: boolean;
    trigger: boolean;
    time: boolean;
    timeUnit: boolean;
    userId: boolean;
    teamId: boolean;
    name: boolean;
    steps: {
        select: {
            id: boolean;
            action: boolean;
            sendTo: boolean;
            reminderBody: boolean;
            emailSubject: boolean;
            template: boolean;
            numberVerificationPending: boolean;
            sender: boolean;
            includeCalendarEvent: boolean;
            numberRequired: boolean;
        };
    };
};
export declare const getAllWorkflows: (eventTypeWorkflows: Workflow[], userId?: number | null, teamId?: number | null, orgId?: number | null, workflowsLockedForUser?: boolean) => Promise<Workflow[]>;
//# sourceMappingURL=getAllWorkflows.d.ts.map