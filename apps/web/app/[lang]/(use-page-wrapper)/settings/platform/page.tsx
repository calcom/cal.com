import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import PlatformView from "~/settings/platform/platform-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(t("platform"), t("platform_description"));
};

const ServerPageWrapper = () => {
  return <PlatformView />;
};

export default ServerPageWrapper;
