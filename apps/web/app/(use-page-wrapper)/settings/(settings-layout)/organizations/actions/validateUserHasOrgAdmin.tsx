import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

export type ValidatedOrgAdminSession = NonNullable<Session> & {
  user: NonNullable<Session["user"]> & {
    id: number;
    org: NonNullable<NonNullable<Session["user"]>["org"]> & {
      role: MembershipRole;
    };
    profile: NonNullable<NonNullable<Session["user"]>["profile"]> & {
      organizationId: number;
    };
  };
};

export async function validateUserHasOrgAdmin(): Promise<ValidatedOrgAdminSession> {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  const orgExists =
    session?.user?.org || session?.user?.profile?.organizationId || session?.user?.profile?.organization;

  if (!orgExists || !session?.user?.id || !session?.user?.profile?.organizationId) {
    redirect("/settings/my-account/profile");
  }

  const userProfile = session?.user?.profile;
  const userId = session?.user?.id;
  const orgRole =
    session?.user?.org?.role ??
    userProfile?.organization?.members.find((m: { userId: number }) => m.userId === userId)?.role;
  const isOrgAdminOrOwner = checkAdminOrOwner(orgRole);

  if (!isOrgAdminOrOwner) {
    redirect("/settings/organizations/profile");
  }

  return session as ValidatedOrgAdminSession;
}
