import Provider from "@pages/auth/sso/[provider]";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { WithLayout } from "app/layoutHOC";
import type { InferGetServerSidePropsType } from "next";

import { getServerSideProps } from "@server/lib/auth/sso/[provider]/getServerSideProps";

export default WithLayout({
  getLayout: null,
  Page: Provider,
  getData: withAppDirSsr<InferGetServerSidePropsType<typeof getServerSideProps>>(getServerSideProps),
})<"P">;
