import AppsPage from "@pages/apps";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getLayout } from "@calcom/features/MainLayoutAppDir";
import { APP_NAME } from "@calcom/lib/constants";

import { getServerSideProps } from "@lib/apps/getServerSideProps";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => `Apps | ${APP_NAME}`,
    () => ""
  );
};

export default WithLayout({ getLayout, getData: withAppDirSsr(getServerSideProps), Page: AppsPage });
