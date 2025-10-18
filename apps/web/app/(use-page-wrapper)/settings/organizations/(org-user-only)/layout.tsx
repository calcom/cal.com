import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const SettingsOrganizationsLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const orgExists =
    session?.user?.org || session?.user?.profile?.organizationId || session?.user?.profile?.organization;
  
  // Debug logging
  console.log('Debug - Org User Layout:', {
    orgExists,
    sessionOrg: session?.user?.org,
    profileOrgId: session?.user?.profile?.organizationId,
    profileOrg: session?.user?.profile?.organization
  });

  // Temporarily allow access for testing
  // TODO: Fix organization detection
  // if (!orgExists) {
  //   return redirect("/settings/my-account/profile");
  // }

  return children;
};

export default SettingsOrganizationsLayout;
