import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import PlatformView from "~/settings/platform/platform-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("platform"),
    (t) => t("platform_description")
  );
};

export default WithLayout({
  getLayout: null,
  Page: PlatformView,
});
