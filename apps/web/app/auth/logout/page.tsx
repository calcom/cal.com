import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/auth/logout/getServerSideProps";

import type { PageProps } from "~/auth/logout-view";
import Logout from "~/auth/logout-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("logged_out"),
    (t) => t("youve_been_logged_out")
  );
};

export default WithLayout({
  Page: Logout,
  getData: withAppDirSsr<PageProps>(getServerSideProps),
});
