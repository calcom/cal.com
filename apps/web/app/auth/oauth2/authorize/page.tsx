import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import Page from "~/auth/oauth2/authorize-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => "Authorize",
    () => ""
  );
};

export default WithLayout({
  getLayout: null,
  Page,
});
