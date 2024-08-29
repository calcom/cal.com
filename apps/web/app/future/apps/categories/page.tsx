import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/apps/categories/getServerSideProps";

import Page from "~/apps/categories/categories-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => "Apps Store",
    () => "Connecting people, technology and the workplace."
  );
};

export default WithLayout({ getData: withAppDirSsr(getServerSideProps), Page, getLayout: null })<"P">;
