import signin from "@pages/auth/signin";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { WithLayout } from "app/layoutHOC";
import type { InferGetServerSidePropsType } from "next";

import { getServerSideProps } from "@server/lib/auth/signin/getServerSideProps";

export default WithLayout({
  getLayout: null,
  Page: signin,
  // @ts-expect-error TODO: fix this
  getData: withAppDirSsr<InferGetServerSidePropsType<typeof getServerSideProps>>(getServerSideProps),
})<"P">;
