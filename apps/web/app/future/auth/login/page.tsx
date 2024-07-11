import Login from "@pages/auth/login";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import type { InferGetServerSidePropsType } from "next";

import { APP_NAME } from "@calcom/lib/constants";

import { getServerSideProps } from "@server/lib/auth/login/getServerSideProps";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${t("login")} | ${APP_NAME}`,
    (t) => t("login")
  );
};

export default WithLayout({
  getLayout: null,
  Page: Login,
  getData: withAppDirSsr<InferGetServerSidePropsType<typeof getServerSideProps>>(getServerSideProps),
})<"P">;
