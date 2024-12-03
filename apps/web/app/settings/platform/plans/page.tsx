import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import PlatformPlansView from "~/settings/platform/plans/platform-plans-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${t("platform")} ${t("plans")}`,
    () => ""
  );
};

export default WithLayout({
  Page: PlatformPlansView,
});
