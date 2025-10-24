import { WorkflowBuilderTemplates } from "@calid/features/modules/workflows/components/workflow_builder_templates";
import { templates } from "@calid/features/modules/workflows/config/workflow_templates";
import type { PageProps } from "app/_types";
import { z } from "zod";

const Page = async ({ searchParams }: { searchParams: { teamId?: string } }) => {
  const { teamId } = await searchParams;

  return <WorkflowBuilderTemplates templates={templates} teamId={teamId} />;
};

export default Page;
