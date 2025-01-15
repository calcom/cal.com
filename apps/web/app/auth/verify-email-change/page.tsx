import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/auth/verify-email-change/getServerSideProps";

import type { PageProps } from "~/auth/verify-email-change-view";
import VerifyEmailChange from "~/auth/verify-email-change-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => "Verify email change",
    () => ""
  );
};

const getData = withAppDirSsr<PageProps>(getServerSideProps);
export default WithLayout({
  getLayout: null,
  Page: VerifyEmailChange,
  getData,
});
