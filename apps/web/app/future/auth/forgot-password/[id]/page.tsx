import SetNewUserPassword from "@pages/auth/forgot-password/[id]";
import { withAppDir } from "app/AppDirSSRHOC";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getForgotPasswordWithIdPageData } from "@server/lib/forgotPasswordWithIdGetData";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("reset_password"),
    (t) => t("change_your_password")
  );
};

export default WithLayout({
  getLayout: null,
  Page: SetNewUserPassword,
  getData: withAppDir(getForgotPasswordWithIdPageData),
})<"P">;
