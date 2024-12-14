import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSidePropsAppDir } from "@lib/apps/installed/[category]/getServerSideProps";

import Page from "~/apps/installed/[category]/installed-category-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("installed_apps"),
    (t) => t("manage_your_connected_apps")
  );
};

const getData = withAppDirSsr(getServerSidePropsAppDir);

export default WithLayout({ getLayout: null, getData, Page });
