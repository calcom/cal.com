import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { trpc } from "@calcom/trpc/react";
import { Meta, showToast, SkeletonLoader } from "@calcom/ui";

import { getLayout } from "../../../settings/layouts/SettingsLayout";
import ConfigureDirectorySync from "../components/ConfigureDirectorySync";

const DirectorySync = () => {
  const { t } = useLocale();

  return (
    <div className="bg-default w-full sm:mx-0 xl:mt-0">
      <Meta title={t("directory_sync")} description={t("directory_sync_description")} />
      {HOSTED_CAL_FEATURES ? <DirectorySyncTeamView /> : <DirectorySyncUserView />}
    </div>
  );
};

// For Hosted Cal - Team view
const DirectorySyncTeamView = () => {
  const router = useRouter();
  const params = useParamsWithFallback();

  const teamId = Number(params.id);

  useEffect(() => {
    if (!HOSTED_CAL_FEATURES) {
      router.push("/404");
    }
  }, []);

  const { data: team, isLoading } = trpc.viewer.teams.get.useQuery(
    { teamId },
    {
      onError: (err) => {
        showToast(err.message, "error");
      },
    }
  );

  if (isLoading) {
    return <SkeletonLoader />;
  }

  if (!team) {
    console.log("No team found");
    router.push("/404");
  }

  return <ConfigureDirectorySync teamId={teamId} />;
};

// For Self-hosted Cal
const DirectorySyncUserView = () => {
  const router = useRouter();

  useEffect(() => {
    if (HOSTED_CAL_FEATURES) {
      router.push("/404");
    }
  }, [router]);

  return <ConfigureDirectorySync teamId={null} />;
};

DirectorySync.getLayout = getLayout;

export default DirectorySync;
