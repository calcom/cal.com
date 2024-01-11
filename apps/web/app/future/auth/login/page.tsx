import Login from "@pages/auth/login";
import { withAppDir } from "app/AppDirSSRHOC";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { APP_NAME } from "@calcom/lib/constants";

import { getLoginPageData } from "@server/lib/loginGetData";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${t("login")} | ${APP_NAME}`,
    (t) => t("login")
  );
};

export default WithLayout({
  getLayout: null,
  Page: Login,
  getData: withAppDir(getLoginPageData),
})<"P">;
