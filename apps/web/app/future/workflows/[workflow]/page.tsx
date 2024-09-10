import { withAppDirSsg } from "app/WithAppDirSsg";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import type { InferGetStaticPropsType } from "next";
import { getServerSession } from "next-auth";
import { headers, cookies } from "next/headers";

import { AUTH_OPTIONS } from "@calcom/features/auth/lib/next-auth-options";
import LegacyPage from "@calcom/features/ee/workflows/pages/workflow";
import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getStaticProps } from "@lib/workflows/[workflow]/getStaticProps";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const { workflow: id } = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));
  const workflow = await WorkflowRepository.getById({ id: +id });

  return await _generateMetadata(
    () => (workflow && workflow.name ? workflow.name : "Untitled"),
    () => ""
  );
};

const getData = withAppDirSsg<InferGetStaticPropsType<typeof getStaticProps>>(getStaticProps);

export const generateStaticParams = () => [];

const Page = async ({ params, searchParams }: PageProps) => {
  const session = await getServerSession(AUTH_OPTIONS);
  const user = session?.user;
  const { workflow: id } = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));
  const workflow = await WorkflowRepository.getById({ id: +id });
  let verifiedEmails, verifiedNumbers;
  try {
    verifiedEmails = await WorkflowRepository.getVerifiedEmails({
      userEmail: user?.email ?? null,
      userId: user?.id ?? null,
      teamId: workflow?.team?.id,
    });
  } catch (err) {}
  try {
    verifiedNumbers = await WorkflowRepository.getVerifiedNumbers({
      userId: user?.id ?? null,
      teamId: workflow?.team?.id,
    });
  } catch (err) {}

  return <LegacyPage workflow={workflow} verifiedEmails={verifiedEmails} verifiedNumbers={verifiedNumbers} />;
};

export default WithLayout({ getLayout: null, getData, ServerPage: Page });
export const dynamic = "force-static";
// generate segments on demand
export const dynamicParams = true;
export const revalidate = 10;
