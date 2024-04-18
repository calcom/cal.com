"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { AppSkeletonLoader as SkeletonLoader, Meta } from "@calcom/ui";

import { getLayout } from "../../../settings/layouts/SettingsLayout";
import SSOConfiguration from "../components/SSOConfiguration";

const SAMLSSO = () => {
  const { t } = useLocale();
  const router = useRouter();

  const {
    data: currentOrg,
    isPending,
    error,
  } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {});

  useEffect(
    function refactorMeWithoutEffect() {
      if (error) {
        router.push("/settings");
      }
    },
    [error]
  );

  if (isPending)
    <SkeletonLoader title={t("sso_saml_heading")} description={t("sso_configuration_description_orgs")} />;
  if (!currentOrg) {
    return null;
  }

  const isAdminOrOwner =
    currentOrg.user.role === MembershipRole.OWNER || currentOrg.user.role === MembershipRole.ADMIN;

  return isAdminOrOwner ? (
    <div className="bg-default w-full sm:mx-0 xl:mt-0">
      <Meta title={t("sso_configuration")} description={t("sso_configuration_description_orgs")} />
      <SSOConfiguration teamId={currentOrg?.id} />
    </div>
  ) : (
    <div className="py-5">
      <span className="text-default text-sm">{t("only_admin_can_manage_sso_org")}</span>
    </div>
  );
};

SAMLSSO.getLayout = getLayout;

export default SAMLSSO;
