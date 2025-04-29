import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { WEBAPP_URL } from "@calcom/lib/constants";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import ManagedUsersView from "~/settings/platform/managed-users/managed-users-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("platform_members"),
    (t) => t("platform_members_description"),
    undefined,
    undefined,
    "/settings/platform/managed-users"
  );

const ServerPageWrapper = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const callbackUrl = `${WEBAPP_URL}/settings/platform/managed-users`;

  if (!session?.user) {
    redirect(`/login?callbackUrl=${callbackUrl}`);
  }

  return <ManagedUsersView />;
};

export default ServerPageWrapper;
