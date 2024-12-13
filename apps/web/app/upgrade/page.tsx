import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import LegacyPage from "~/upgrade/upgrade-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("upgrade"),
    () => ""
  );

export default WithLayout({ getLayout: null, Page: LegacyPage })<"P">;
