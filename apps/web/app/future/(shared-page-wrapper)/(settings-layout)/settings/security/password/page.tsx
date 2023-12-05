import Page from "@pages/settings/security/password";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("password"),
    (t) => t("password_description")
  );

export default Page;
