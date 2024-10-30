import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/apps/getServerSideProps";

import AppsPage from "~/apps/apps-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("app_store"),
    (t) => t("app_store_description")
  );
};

export default WithLayout({
  getData: withAppDirSsr(getServerSideProps),
  Page: AppsPage,
});
