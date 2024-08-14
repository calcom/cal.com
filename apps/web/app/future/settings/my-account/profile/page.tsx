import { _generateMetadata } from "app/_utils";

import Page from "~/settings/my-account/profile-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("profile"),
    (t) => t("profile_description")
  );

export default Page;
