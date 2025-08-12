import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

const OrgAdminOnlyLayout = async ({ children }: { children: React.ReactNode }) => {
  const req = {
    headers: (await headers()) as any,
    cookies: (await cookies()) as any,
  } as any;
  const session = await getServerSession({ req: { headers: req.headers, cookies: req.cookies } as any });
  const userProfile = session?.user?.profile;
  const userId = session?.user?.id;
  const orgRole =
    session?.user?.org?.role ??
    userProfile?.organization?.members.find((m: { userId: number }) => m.userId === userId)?.role;
  const isOrgAdminOrOwner = checkAdminOrOwner(orgRole);

  if (!isOrgAdminOrOwner) {
    return redirect("/settings/organizations/profile");
  }

  return children;
};

export default OrgAdminOnlyLayout;
