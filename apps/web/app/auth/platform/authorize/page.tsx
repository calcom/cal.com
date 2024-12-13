import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import Page from "~/auth/platform/authorize-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("authorize"),
    () => ""
  );
};

export default WithLayout({
  getLayout: null,
  Page,
});
