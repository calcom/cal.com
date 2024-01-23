import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import type { InferGetServerSidePropsType } from "next";

import { getServerSideProps } from "@calcom/app-store/_pages/setup/_getServerSideProps";
import { APP_NAME } from "@calcom/lib/constants";

import SetupInformation from "@components/pages/apps/[slug]/setup";

export const generateMetadata = async ({ params }: { params: Record<string, string | string[]> }) => {
  return await _generateMetadata(
    () => `${params.slug} | ${APP_NAME}`,
    () => ""
  );
};

type T = InferGetServerSidePropsType<typeof getServerSideProps>;

const getData = withAppDirSsr<T>(getServerSideProps);

export default WithLayout({ getLayout: null, Page: SetupInformation, getData });
