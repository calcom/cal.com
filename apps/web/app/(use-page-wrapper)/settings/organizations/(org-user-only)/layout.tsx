import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

const SettingsOrganizationsLayout = async ({ children }: { children: React.ReactNode }) => {
  const req = {
    headers: (await headers()) as any,
    cookies: (await cookies()) as any,
  } as any;
  const session = await getServerSession({ req: { headers: req.headers, cookies: req.cookies } as any });
  const orgExists =
    session?.user?.org || session?.user?.profile?.organizationId || session?.user?.profile?.organization;
  if (!orgExists) {
    return redirect("/settings/my-account/profile");
  }

  return children;
};

export default SettingsOrganizationsLayout;
