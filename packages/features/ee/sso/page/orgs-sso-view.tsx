"use client";

import { useSession } from "next-auth/react";

import { SkeletonLoader } from "@calcom/features/apps/components/SkeletonLoader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";

import SSOConfiguration from "../components/SSOConfiguration";

const SAMLSSO = () => {
  const { t } = useLocale();

  const { data, status } = useSession();
  const org = data?.user.org;

  if (status === "loading") <SkeletonLoader />;

  if (!org) {
    return null;
  }

  const isAdminOrOwner = org.role === MembershipRole.OWNER || org.role === MembershipRole.ADMIN;

  return !!isAdminOrOwner ? (
    <div className="bg-default w-full sm:mx-0 xl:mt-0">
      <SSOConfiguration teamId={org.id} />
    </div>
  ) : (
    <div className="py-5">
      <span className="text-default text-sm">{t("only_admin_can_manage_sso_org")}</span>
    </div>
  );
};

export default SAMLSSO;
