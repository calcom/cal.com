import Page from "@pages/settings/security/passkeys";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("passkeys"),
    (t) => t("passkeys_description")
  );

export default Page;
