import LegacyPage from "@pages/maintenance";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { APP_NAME } from "@calcom/lib/constants";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => `${t("under_maintenance")} | ${APP_NAME}`,
    (t) => t("under_maintenance_description", { appName: APP_NAME })
  );

export default WithLayout({ getLayout: null, Page: LegacyPage })<"P">;
