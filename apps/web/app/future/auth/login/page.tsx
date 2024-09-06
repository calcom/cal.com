import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/auth/login/getServerSideProps";

import type { PageProps } from "~/auth/login-view";
import Login from "~/auth/login-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("login"),
    (t) => t("login")
  );
};

export default WithLayout({
  getLayout: null,
  Page: Login,
  getData: withAppDirSsr<PageProps>(getServerSideProps),
})<"P">;
