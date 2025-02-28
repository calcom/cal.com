import { _generateMetadata } from "app/_utils";

import PlatformView from "~/settings/platform/platform-view";

export const generateMetadata = async ({params}: PageProps) => {
  return await _generateMetadata(
     t("platform"),
     t("platform_description")
  );
};

const ServerPageWrapper = () => {
  return <PlatformView />;
};

export default ServerPageWrapper;
