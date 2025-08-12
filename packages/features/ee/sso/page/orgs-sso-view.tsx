"use client";

import { useSession } from "next-auth/react";

import { SkeletonLoader } from "@calcom/features/apps/components/SkeletonLoader";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import SSOConfiguration from "../components/SSOConfiguration";

interface OrgSSOViewProps {
  permissions?: {
    canEdit: boolean;
  };
}

const SAMLSSO = ({ permissions }: OrgSSOViewProps) => {
  const { t } = useLocale();

  const { data, status } = useSession();
  const org = data?.user.org;

  if (status === "loading") return <SkeletonLoader />;

  if (!org) {
    return null;
  }

  const canEdit = permissions?.canEdit ?? false;

  return canEdit ? (
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
