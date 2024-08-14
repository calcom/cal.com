import { _generateMetadata } from "app/_utils";

import Page from "~/settings/my-account/general-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("general"),
    (t) => t("general_description")
  );

export default Page;
