// import { cookies, headers } from "next/headers";
// import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
// import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import LegacyPage from "@calcom/web/modules/ee/workflows/views/WorkflowPage";
import type { PageProps } from "app/_types";
import { z } from "zod";

const querySchema = z.object({
  workflow: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "workflow must be a string that can be cast to a number",
    })
    .transform((val) => Number(val)),
});

const Page = async ({ params }: PageProps) => {
  // const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  // const user = session?.user;
  const parsed = querySchema.safeParse(await params);
  if (!parsed.success) throw new Error("Invalid workflow id");

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
      workflow={parsed.data.workflow}
      //  workflowData={workflow} verifiedEmails={verifiedEmails} verifiedNumbers={verifiedNumbers}
    />
  );
};

export default Page;
