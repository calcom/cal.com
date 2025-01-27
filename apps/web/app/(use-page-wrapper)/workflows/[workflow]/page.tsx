import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

// import { cookies, headers } from "next/headers";
// import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
// import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import LegacyPage from "@calcom/features/ee/workflows/pages/workflow";
import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";

const querySchema = z.object({
  workflow: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "workflow must be a string that can be cast to a number",
    })
    .transform((val) => Number(val)),
});

const getWorkflow = cache((id: number) => WorkflowRepository.getById({ id }));

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata | null> => {
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    notFound();
  }
  const workflow = await getWorkflow(parsed.data.workflow);
  if (!workflow) {
    notFound();
  }
  return await _generateMetadata(
    (t) => (workflow && workflow.name ? workflow.name : t("untitled")),
    () => ""
  );
};

export const generateStaticParams = () => [];

const Page = async ({ params }: PageProps) => {
  // const session = await getServerSession({ req: buildLegacyRequest(headers(), cookies()) });
  // const user = session?.user;
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    notFound();
  }

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

  return (
    <LegacyPage
    //  workflowData={workflow} verifiedEmails={verifiedEmails} verifiedNumbers={verifiedNumbers}
    />
  );
};

export default Page;
export const dynamic = "force-static";
// generate segments on demand
export const dynamicParams = true;
export const revalidate = 10;
