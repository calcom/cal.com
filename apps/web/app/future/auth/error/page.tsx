import { withAppDirSsg } from "app/WithAppDirSsg";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getStaticProps } from "@server/lib/auth/error/getStaticProps";

import Page from "~/auth/error/error-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => "Error",
    () => ""
  );
};

const getData = withAppDirSsg(getStaticProps);

export default WithLayout({ getData, Page, getLayout: null })<"P">;
export const dynamic = "force-static";
