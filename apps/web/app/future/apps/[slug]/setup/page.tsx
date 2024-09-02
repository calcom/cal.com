import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@calcom/app-store/_pages/setup/_getServerSideProps";

import Page, { type PageProps } from "~/apps/[slug]/setup/setup-view";

export const generateMetadata = async ({ params }: _PageProps) => {
  return await _generateMetadata(
    () => `${params.slug}`,
    () => ""
  );
};

const getData = withAppDirSsr<PageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, Page, getData });
