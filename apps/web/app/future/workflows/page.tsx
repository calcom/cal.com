import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import LegacyPage from "@calcom/features/ee/workflows/pages/index";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("workflows"),
    (t) => t("workflows_to_automate_notifications")
  );

export default WithLayout({ getLayout: null, Page: LegacyPage })<"P">;
