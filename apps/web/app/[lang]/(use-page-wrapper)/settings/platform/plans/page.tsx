import { _generateMetadata } from "app/_utils";

import PlatformPlansView from "~/settings/platform/plans/platform-plans-view";

export const generateMetadata = async ({params}: PageProps) => {
  return await _generateMetadata(
     `${t("platform")} ${t("plans")}`,
    ""
  );
};

const ServerPageWrapper = () => {
  return <PlatformPlansView />;
};

export default ServerPageWrapper;
