import { _generateMetadata } from "app/_utils";

import CreateWorkflowAgent, {
  LayoutWrapper,
} from "@calcom/features/ee/cal-ai-phone/components/CreateWorkflowAgent";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_new_workflow_agent"),
    (t) => t("create_new_workflow_agent_description"),
    undefined,
    undefined,
    "/workflow-agent/new"
  );

const ServerPage = async () => {
  return (
    <LayoutWrapper>
      <CreateWorkflowAgent />
    </LayoutWrapper>
  );
};

export default ServerPage;
