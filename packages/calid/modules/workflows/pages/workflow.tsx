import { WorkflowBuilder } from "../components/workflow_builder";

const WorkflowBuilderPage = ({ workflow }: { workflow: number }) => {
  return <WorkflowBuilder workflowId={workflow} />;
};

export default WorkflowBuilderPage;
