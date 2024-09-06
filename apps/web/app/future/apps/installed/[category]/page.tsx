import Page from "@pages/apps/installed/[category]";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/apps/installed/[category]/getServerSideProps";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${t("installed_apps")}`,
    (t) => t("manage_your_connected_apps")
  );
};

const getData = withAppDirSsr(getServerSideProps);

export default WithLayout({ getLayout: null, getData, Page });
