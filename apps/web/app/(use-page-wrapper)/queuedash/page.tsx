import { _generateMetadata } from "app/_utils";

import { BackgroundJobsView } from "~/settings/admin/BackgroundJobsView";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("background_jobs"),
    (t) => t("background_jobs_description"),
    undefined,
    undefined,
    "/settings/test/jobs"
  );

const Page = () => {
  return <BackgroundJobsView />;
};

export default Page;
