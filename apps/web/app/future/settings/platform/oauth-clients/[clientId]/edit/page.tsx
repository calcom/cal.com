import { _generateMetadata } from "app/_utils";

import EditView from "~/settings/platform/oauth-clients/[clientId]/edit/edit-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t(""),
    (t) => t("")
  );

export default EditView;
