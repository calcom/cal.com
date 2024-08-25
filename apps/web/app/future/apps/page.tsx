import AppsPage from "@pages/apps";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getLayout } from "@calcom/features/MainLayoutAppDir";

import { getServerSideProps } from "@lib/apps/getServerSideProps";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("app_store"),
    (t) => t("app_store_description")
  );
};

export default WithLayout({ getLayout, getData: withAppDirSsr(getServerSideProps), Page: AppsPage });
