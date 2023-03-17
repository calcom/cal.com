import { useRouter } from "next/router";
import { useEffect } from "react";

import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { AppSkeletonLoader as SkeletonLoader } from "@calcom/ui";
import { Meta } from "@calcom/ui";

import { getLayout } from "../../../settings/layouts/SettingsLayout";
import SSOConfiguration from "../components/SSOConfiguration";

const SAMLSSO = () => {
  const { t } = useLocale();
  const router = useRouter();

  const teamId = Number(router.query.id);

  const { data: team, isLoading } = trpc.viewer.teams.get.useQuery(
    { teamId },
    {
      onError: () => {
        router.push("/settings");
      },
    }
  );

  useEffect(() => {
    if (!HOSTED_CAL_FEATURES) {
      router.push("/404");
    }
  }, []);

  if (isLoading) {
    return <SkeletonLoader />;
  }

  if (!team) {
    router.push("/404");
    return;
  }

  return (
    <div className="w-full bg-white sm:mx-0 xl:mt-0">
      <Meta title={t("sso_configuration")} description={t("sso_configuration_description")} />
      <SSOConfiguration teamId={teamId} />
    </div>
  );
};

SAMLSSO.getLayout = getLayout;

export default SAMLSSO;
