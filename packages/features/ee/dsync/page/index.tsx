import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { Meta } from "@calcom/ui";

import { getLayout } from "../../../settings/layouts/SettingsLayout";
import ConfigureDirectorySync from "../components/ConfigureDirectorySync";

const DirectorySync = () => {
  const params = useParamsWithFallback();
  const { t } = useLocale();

  const teamId = Number(params.id) || null;

  // const { data: team, isLoading } = trpc.viewer.teams.get.useQuery(
  //   { teamId },
  //   {
  //     onError: () => {
  //       router.push("/settings");
  //     },
  //   }
  // );

  // useEffect(() => {
  //   if (!HOSTED_CAL_FEATURES) {
  //     router.push("/404");
  //   }
  // }, []);

  // if (isLoading) {
  //   return <SkeletonLoader />;
  // }

  // if (!team) {
  //   router.push("/404");
  //   return;
  // }

  return (
    <div className="bg-default w-full sm:mx-0 xl:mt-0">
      <Meta title={t("directory_sync")} description={t("directory_sync_description")} />
      {teamId ? <DirectorySyncTeamView teamId={teamId} /> : <DirectorySyncUserView />}
    </div>
  );
};

const DirectorySyncUserView = () => {
  const router = useRouter();

  return <ConfigureDirectorySync teamId={null} />;
};

const DirectorySyncTeamView = ({ teamId }: { teamId: number }) => {
  const router = useRouter();

  return <ConfigureDirectorySync teamId={teamId} />;
};

DirectorySync.getLayout = getLayout;

export default DirectorySync;
