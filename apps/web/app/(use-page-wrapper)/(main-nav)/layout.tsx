import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { setUser as SentrySetUser } from "@sentry/nextjs";
import { cookies, headers } from "next/headers";
import type React from "react";
import Shell from "~/shell/Shell";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (session?.user?.id) SentrySetUser({ id: session.user.id });

  return (
    <>
      <Shell withoutMain={true}>{children}</Shell>
    </>
  );
};

export default Layout;
