import LegacyPage, { WrappedSetPasswordPage } from "@pages/settings/organizations/[id]/set-password";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("set_a_password"),
    (t) => t("set_a_password_description")
  );

export default WithLayout({ Page: LegacyPage, getLayout: WrappedSetPasswordPage });
