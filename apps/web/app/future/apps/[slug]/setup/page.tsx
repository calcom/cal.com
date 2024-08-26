import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@calcom/app-store/_pages/setup/_getServerSideProps";
import { APP_NAME } from "@calcom/lib/constants";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import Page from "~/apps/[slug]/setup/setup-view";

export const generateMetadata = async ({ params }: { params: Record<string, string | string[]> }) => {
  return await _generateMetadata(
    () => `${params.slug} | ${APP_NAME}`,
    () => ""
  );
};

type T = inferSSRProps<typeof getServerSideProps>;

const getData = withAppDirSsr<T>(getServerSideProps);

export default WithLayout({ getLayout: null, Page, getData });
