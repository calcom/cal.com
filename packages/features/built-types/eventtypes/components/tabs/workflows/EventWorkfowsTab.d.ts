/// <reference types="react" />
import type { WorkflowType } from "@calcom/features/ee/workflows/components/WorkflowListPage";
import type { RouterOutputs } from "@calcom/trpc/react";
type PartialWorkflowType = Pick<WorkflowType, "name" | "activeOn" | "isOrg" | "steps" | "id" | "readOnly">;
type EventTypeSetup = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"];
type Props = {
    eventType: EventTypeSetup;
    workflows: PartialWorkflowType[];
};
declare function EventWorkflowsTab(props: Props): JSX.Element;
export default EventWorkflowsTab;
//# sourceMappingURL=EventWorkfowsTab.d.ts.map