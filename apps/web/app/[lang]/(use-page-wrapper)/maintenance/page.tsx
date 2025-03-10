import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import { APP_NAME } from "@calcom/lib/constants";

import LegacyPage from "~/maintenance/maintenance-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(
    t("under_maintenance"),
    t("under_maintenance_description", { appName: APP_NAME })
  );
};

const ServerPageWrapper = async () => {
  return <LegacyPage />;
};
export default ServerPageWrapper;
