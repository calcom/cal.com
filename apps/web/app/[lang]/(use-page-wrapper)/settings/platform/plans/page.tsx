import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import PlatformPlansView from "~/settings/platform/plans/platform-plans-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(`${t("platform")} ${t("plans")}`, "");
};

const ServerPageWrapper = () => {
  return <PlatformPlansView />;
};

export default ServerPageWrapper;
