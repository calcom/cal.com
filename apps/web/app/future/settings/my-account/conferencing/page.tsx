import { _generateMetadata } from "app/_utils";

import Page from "~/settings/my-account/conferencing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("conferencing"),
    (t) => t("conferencing_description")
  );

export default Page;
