import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import CreateNewView from "~/settings/platform/oauth-clients/create-new-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("oAuth_client_creation_form"),
    () => ""
  );
};

export default WithLayout({
  getLayout: null,
  Page: CreateNewView,
});
