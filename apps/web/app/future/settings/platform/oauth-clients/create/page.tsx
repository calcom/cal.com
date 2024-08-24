import { _generateMetadata } from "app/_utils";

import CreateNewView from "~/settings/platform/oauth-clients/create-new-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t(""),
    (t) => t("")
  );

export default CreateNewView;
