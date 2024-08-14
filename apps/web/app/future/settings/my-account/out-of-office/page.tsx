import { _generateMetadata } from "app/_utils";

import Page from "~/settings/my-account/out-of-office-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("out_of_office"),
    (t) => t("out_of_office_description")
  );

export default Page;
