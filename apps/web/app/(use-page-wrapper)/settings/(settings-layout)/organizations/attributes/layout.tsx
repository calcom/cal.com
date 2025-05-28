import { cookies, headers } from "next/headers";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const AttributesLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.org) {
    redirect("/settings/my-account/profile");
  }
  const isOrgAdminOrOwner = checkAdminOrOwner(session?.user?.org?.role);

  if (!isOrgAdminOrOwner) {
    redirect("/settings/organizations/profile");
  }

  return children;
};

export default AttributesLayout;
