/// <reference types="react" />
import type { WorkflowStep } from "@prisma/client";
import type { TimeUnit, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { MultiSelectCheckboxesOptionType as Option } from "@calcom/ui";
export type FormValues = {
    name: string;
    activeOn: Option[];
    steps: (WorkflowStep & {
        senderName: string | null;
    })[];
    trigger: WorkflowTriggerEvents;
    time?: number;
    timeUnit?: TimeUnit;
    selectAll: boolean;
};
declare function WorkflowPage(): JSX.Element;
export default WorkflowPage;
//# sourceMappingURL=workflow.d.ts.map