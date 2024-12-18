import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/auth/forgot-password/[id]/getServerSideProps";

import type { PageProps } from "~/auth/forgot-password/[id]/forgot-password-single-view";
import SetNewUserPassword from "~/auth/forgot-password/[id]/forgot-password-single-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("reset_password"),
    (t) => t("change_your_password")
  );
};

export default WithLayout({
  getLayout: null,
  Page: SetNewUserPassword,
  getData: withAppDirSsr<PageProps>(getServerSideProps),
})<"P">;
