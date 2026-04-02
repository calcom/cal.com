"use client";

import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import { SkeletonLoader } from "@calcom/web/modules/apps/components/SkeletonLoader";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ConfigureDirectorySync from "../components/ConfigureDirectorySync";

// For Hosted Cal - Team view
const DirectorySync = ({ permissions }: { permissions?: { canEdit: boolean } }) => {
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

  if (!permissions?.canEdit) {
    router.push("/404");
  }

  return (
    <div className="bg-default w-full sm:mx-0 xl:mt-0">
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

export default DirectorySync;
