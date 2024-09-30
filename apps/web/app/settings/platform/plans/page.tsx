import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import PlatformPlansView from "~/settings/platform/plans/platform-plans-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => "Platform plans",
    () => ""
  );
};

export default WithLayout({
  Page: PlatformPlansView,
});
