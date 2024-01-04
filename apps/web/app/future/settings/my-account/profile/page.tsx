import Page from "@pages/settings/my-account/profile";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("profile"),
    (t) => t("profile_description")
  );

export default Page;
