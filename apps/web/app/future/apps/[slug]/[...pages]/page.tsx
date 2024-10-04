import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import type { GetServerSidePropsResult } from "next";

import { getServerSideProps } from "@lib/apps/[slug]/[...pages]/getServerSideProps";

import LegacyPage, { getLayout } from "~/apps/[slug]/[...pages]/pages-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("routing_forms"),
    (t) => t("routing_forms_description")
  );
};

const getData = withAppDirSsr<GetServerSidePropsResult<any>>(getServerSideProps);

export default WithLayout({
  getLayout,
  getData,
  Page: LegacyPage,
});
