import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/forgot-password/getServerSideProps";

import type { PageProps } from "~/auth/forgot-password/forgot-password-view";
import ForgotPassword from "~/auth/forgot-password/forgot-password-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("forgot_password"),
    (t) => t("request_password_reset")
  );
};

export default WithLayout({
  getLayout: null,
  Page: ForgotPassword,
  getData: withAppDirSsr<PageProps>(getServerSideProps),
})<"P">;
