import Page from "@pages/settings/my-account/calendars";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("calendars"),
    (t) => t("calendars_description")
  );

export default Page;
