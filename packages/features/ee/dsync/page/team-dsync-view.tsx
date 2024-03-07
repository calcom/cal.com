import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Meta, SkeletonLoader, showToast } from "@calcom/ui";

import { getLayout } from "../../../settings/layouts/SettingsLayout";
import ConfigureDirectorySync from "../components/ConfigureDirectorySync";

// For Hosted Cal - Team view
const DirectorySync = () => {
  const { t } = useLocale();
  const router = useRouter();

  const { data: currentOrg, isLoading, error } = trpc.viewer.organizations.listCurrent.useQuery();

  useEffect(() => {
    if (!HOSTED_CAL_FEATURES) {
      router.push("/404");
    }
  }, [router]);

  if (isLoading) {
    return <SkeletonLoader />;
  }

  if (!currentOrg?.id) {
    router.push("/404");
  }

  if (error) {
    showToast(error.message, "error");
  }

  return (
    <div className="bg-default w-full sm:mx-0 xl:mt-0">
      <Meta title={t("directory_sync")} description={t("directory_sync_description")} />
      {HOSTED_CAL_FEATURES && <ConfigureDirectorySync organizationId={currentOrg?.id || null} />}
      {/* TODO add additional settings for dsync */}
      {/* <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title="Map groups to teams 1:1"
        description="Members will be auto assigned to teams with the same name as their group."
        switchContainerClassName="mt-6"
      />
      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title="Create new teams based on groups"
        description="Automatically create new teams if a new group is pushed"
        switchContainerClassName="mt-6"
      />
      <Button>Default team config</Button> */}
    </div>
  );
};

DirectorySync.getLayout = getLayout;

export default DirectorySync;
