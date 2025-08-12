import { setUser as SentrySetUser } from "@sentry/nextjs";
import { cookies, headers } from "next/headers";
import React from "react";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import Shell from "@calcom/features/shell/Shell";

import { buildLegacyHeaders, buildLegacyCookies } from "@lib/buildLegacyCtx";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const req = {
    headers: buildLegacyHeaders(await headers()),
    cookies: buildLegacyCookies(await cookies()),
  } as any;
  const session = await getServerSession({ req });
  if (session?.user?.id) SentrySetUser({ id: session.user.id });

  return (
    <>
      <Shell withoutMain={true}>{children}</Shell>
    </>
  );
};

export default Layout;
