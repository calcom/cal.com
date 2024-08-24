import { _generateMetadata } from "app/_utils";

import PlatformView from "~/settings/platform/platform-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t(""),
    (t) => t("")
  );

export default PlatformView;
