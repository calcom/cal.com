import { _generateMetadata } from "app/_utils";

import CreateAgentStep, { LayoutWrapper } from "@calcom/features/ee/cal-ai-phone/components/CreateAgentStep";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_workflow_agent"),
    (t) => t("create_workflow_agent_description"),
    undefined,
    undefined,
    "/workflow-agent/create"
  );

const ServerPage = async () => {
  return (
    <LayoutWrapper>
      <CreateAgentStep />
    </LayoutWrapper>
  );
};

export default ServerPage;
