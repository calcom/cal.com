import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import Page from "~/more/more-page-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => "More",
    () => ""
  );
};

export default WithLayout({ getLayout: null, Page })<"P">;
