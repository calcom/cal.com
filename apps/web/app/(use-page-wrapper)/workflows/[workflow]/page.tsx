// import { cookies, headers } from "next/headers";
// import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
// import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import LegacyPage from "@calid/features/modules/workflows/pages/workflow";
import type { PageProps } from "app/_types";
import { z } from "zod";

import type { WorkflowBuilderTemplateFields } from "../config/workflow_templates";

// import LegacyPage from "@calcom/features/ee/workflows/pages/workflow";

const querySchema = z.object({
  workflow: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "workflow must be a string that can be cast to a number",
    })
    .transform((val) => Number(val)),
});

const searchParamsSchema = z.object({
  name: z.string(),
  actionType: z.string(),
  template: z.string(),
  triggerEvent: z.string(),
  time: z.number().int().nullish(),
});

const Page = async ({ params, searchParams }: PageProps) => {
  // const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  // const user = session?.user;
  const parsed = querySchema.safeParse(await params);
  if (!parsed.success) throw new Error("Invalid workflow id");

  const searchParamsParsed = searchParamsSchema.safeParse(await params);

  const builderTemplateFields = !searchParamsParsed.success ? null : searchParamsParsed.data;

  // const workflow = await WorkflowRepository.getById({ id: +parsed.data.workflow });
  // let verifiedEmails, verifiedNumbers;
  // try {
  //   verifiedEmails = await WorkflowRepository.getVerifiedEmails({
  //     userEmail: user?.email ?? null,
  //     userId: user?.id ?? null,
  //     teamId: workflow?.team?.id,
  //   });
  // } catch (err) {}
  // try {
  //   verifiedNumbers = await WorkflowRepository.getVerifiedNumbers({
  //     userId: user?.id ?? null,
  //     teamId: workflow?.team?.id,
  //   });
  // } catch (err) {}
  // const t = await getTranslate();

  return (
    // <Shell heading={t("workflows")} subtitle={t("workflows_edit_description")}>
    <LegacyPage
      workflow={parsed.data.workflow}
      builderTemplate={
        builderTemplateFields
          ? {
              name: builderTemplateFields.name as WorkflowBuilderTemplateFields["name"],
              actionType: builderTemplateFields.actionType as WorkflowBuilderTemplateFields["actionType"],
              template: builderTemplateFields.template as WorkflowBuilderTemplateFields["template"],
              trigger: builderTemplateFields.triggerEvent as WorkflowBuilderTemplateFields["trigger"],
              time: builderTemplateFields.time as WorkflowBuilderTemplateFields["time"],
            }
          : null
      }

      //  workflowData={workflow} verifiedEmails={verifiedEmails} verifiedNumbers={verifiedNumbers}
    />
    // </Shell>
  );
};

export default Page;
