import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import PlatformView from "~/settings/platform/platform-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => "Platform",
    () => "Manage everything related to platform."
  );
};

export default WithLayout({
  getLayout: null,
  Page: PlatformView,
});
