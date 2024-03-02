import Page from "@pages/apps/categories/index";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { APP_NAME } from "@calcom/lib/constants";

import { getServerSideProps } from "@lib/apps/categories/getServerSideProps";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => `Categories | ${APP_NAME}`,
    () => ""
  );
};

export default WithLayout({ getData: withAppDirSsr(getServerSideProps), Page, getLayout: null })<"P">;
