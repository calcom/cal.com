import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { APP_NAME } from "@calcom/lib/constants";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import Page from "~/getting-started/[[...step]]/onboarding-view";

export const generateMetadata = async ({ params }: ServerPageProps) => {
  const stepParam = (await params).step;
  const step = stepParam && Array.isArray(stepParam) ? stepParam.join("/") : "";
  return await _generateMetadata(
    (t) => `${APP_NAME} - ${t("getting_started")}`,
    () => "",
    true,
    undefined,
    `/getting-started${step ? `/${step}` : ""}`
  );
};

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const userRepo = new UserRepository(prisma);
  const user = await userRepo.findUserTeams({
    id: session.user.id,
  });

  if (!user) {
    return redirect("/auth/login");
  }

  return <Page hasPendingInvites={!!user.teams.find((team) => team.accepted === false)} />;
};

export default ServerPage;
