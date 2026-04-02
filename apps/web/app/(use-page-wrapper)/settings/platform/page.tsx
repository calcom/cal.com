import { _generateMetadata } from "app/_utils";
import PlatformView from "~/settings/platform/platform-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("platform"),
    (t) => t("platform_description"),
    undefined,
    undefined,
    "/settings/platform"
  );
};

const ServerPageWrapper = () => {
  return <PlatformView />;
};

export default ServerPageWrapper;
