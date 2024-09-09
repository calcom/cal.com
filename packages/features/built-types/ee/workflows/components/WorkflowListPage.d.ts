/// <reference types="react" />
import type { Membership, Workflow } from "@prisma/client";
import type { WorkflowStep } from "../lib/types";
export type WorkflowType = Workflow & {
    team: {
        id: number;
        name: string;
        members: Membership[];
        slug: string | null;
        logo?: string | null;
    } | null;
    steps: WorkflowStep[];
    activeOnTeams?: {
        team: {
            id: number;
            name?: string | null;
        };
    }[];
    activeOn?: {
        eventType: {
            id: number;
            title: string;
            parentId: number | null;
            _count: {
                children: number;
            };
        };
    }[];
    readOnly?: boolean;
    isOrg?: boolean;
};
interface Props {
    workflows: WorkflowType[] | undefined;
}
export default function WorkflowListPage({ workflows }: Props): JSX.Element;
export {};
//# sourceMappingURL=WorkflowListPage.d.ts.map