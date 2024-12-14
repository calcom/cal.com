import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { APP_NAME } from "@calcom/lib/constants";

import LegacyPage from "~/maintenance/maintenance-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("under_maintenance"),
    (t) => t("under_maintenance_description", { appName: APP_NAME })
  );
};

export default WithLayout({ getLayout: null, Page: LegacyPage })<"P">;
