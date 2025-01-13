import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import Page from "~/auth/error/error-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("error"),
    () => ""
  );
};

export default WithLayout({ Page })<"P">;
export const dynamic = "force-static";
