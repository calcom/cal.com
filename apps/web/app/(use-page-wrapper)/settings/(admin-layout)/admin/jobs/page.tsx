import { _generateMetadata, getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("background_jobs"),
    (t) => t("background_jobs_description"),
    undefined,
    undefined,
    "/settings/admin/jobs"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("background_jobs")} description={t("background_jobs_description")}>
      <div className="flex w-full flex-col" style={{ height: "calc(100vh - 50px)" }}>
        <iframe src="/queuedash" className="w-full flex-1 border-0" title="Background Jobs Dashboard" />
      </div>
    </SettingsHeader>
  );
};

export default Page;
