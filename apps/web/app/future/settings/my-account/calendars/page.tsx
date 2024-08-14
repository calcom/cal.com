import { _generateMetadata } from "app/_utils";

import Page from "~/settings/my-account/calendars-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("calendars"),
    (t) => t("calendars_description")
  );

export default Page;
