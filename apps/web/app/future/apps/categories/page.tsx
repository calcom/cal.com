import Page from "@pages/apps/categories/index";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/apps/categories/getServerSideProps";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => `Categories`,
    () => ""
  );
};

export default WithLayout({ getData: withAppDirSsr(getServerSideProps), Page, getLayout: null })<"P">;
