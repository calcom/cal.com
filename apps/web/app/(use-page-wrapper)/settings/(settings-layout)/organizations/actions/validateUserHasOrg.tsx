import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

export type ValidatedOrgSession = NonNullable<Session> & {
  user: NonNullable<Session["user"]> & {
    id: number;
    org: NonNullable<NonNullable<Session["user"]>["org"]>;
    profile: NonNullable<NonNullable<Session["user"]>["profile"]> & {
      organizationId: number;
    };
  };
};

export async function validateUserHasOrg(): Promise<ValidatedOrgSession> {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  const orgExists =
    session?.user?.org || session?.user?.profile?.organizationId || session?.user?.profile?.organization;

  if (!orgExists || !session?.user?.id || !session?.user?.profile?.organizationId) {
    redirect("/settings/my-account/profile");
  }

  return session as ValidatedOrgSession;
}
