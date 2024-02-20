import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import { getLayout } from "../../../settings/layouts/SettingsLayout";
import ConfigureDirectorySync from "../components/ConfigureDirectorySync";

// For Self-hosted Cal
const DirectorySync = () => {
  const { t } = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (HOSTED_CAL_FEATURES) {
      router.push("/404");
    }
  }, [router]);

  return (
    <div className="bg-default w-full sm:mx-0 xl:mt-0">
      <Meta title={t("directory_sync")} description={t("directory_sync_description")} />
      {!HOSTED_CAL_FEATURES && <ConfigureDirectorySync orgId={null} />}
    </div>
  );
};

DirectorySync.getLayout = getLayout;

export default DirectorySync;
