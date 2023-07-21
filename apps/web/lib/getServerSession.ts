import { getServerSession as getServerSessionRSC } from "next-auth";
import { redirect } from "next/navigation";

import { AUTH_OPTIONS } from "@calcom/features/auth/lib/next-auth-options";

// This should only be called in RSC
export async function getServerSession(redirectTo?: string) {
  const session = getServerSessionRSC(AUTH_OPTIONS);

  if (!session && redirectTo) {
    redirect(redirectTo);
  }

  return session;
}
