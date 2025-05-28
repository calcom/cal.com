import { cookies, headers } from "next/headers";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const SettingsOrganizationsLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.org) {
    redirect("/settings/my-account/profile");
  }

  return children;
};

export default SettingsOrganizationsLayout;
