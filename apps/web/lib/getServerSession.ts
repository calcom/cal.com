import { getServerSession as getServerSessionRSC } from "next-auth";

import { AUTH_OPTIONS } from "@calcom/features/auth/lib/next-auth-options";

export async function getServerSession() {
  return getServerSessionRSC(AUTH_OPTIONS);
}
