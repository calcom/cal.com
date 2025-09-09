import { setUser as SentrySetUser } from "@sentry/nextjs";
import { cookies, headers } from "next/headers";
import React from "react";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import Shell from "@calcom/features/shell/Shell";
import { NavigationPermissionsProvider } from "@calcom/features/shell/context/NavigationPermissionsProvider";
import { checkNavigationPermissions } from "@calcom/features/shell/context/utils/checkNavigationPermissions";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (session?.user?.id) SentrySetUser({ id: session.user.id });

  const navigationPermissions = session?.user?.id
    ? await checkNavigationPermissions(
        session.user.id,
        session.user.profile?.organizationId || session.user.org?.id || null
      )
    : {
        insights: false,
        workflows: false,
        routing: false,
        teams: false,
        members: false,
      };

  return (
    <>
      <NavigationPermissionsProvider value={navigationPermissions}>
        <Shell withoutMain={true}>{children}</Shell>
      </NavigationPermissionsProvider>
    </>
  );
};

export default Layout;
