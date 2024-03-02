import LegacyPage, { type SignupProps } from "@pages/signup";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/signup/getServerSideProps";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("sign_up"),
    (t) => t("sign_up")
  );

const getData = withAppDirSsr<SignupProps>(getServerSideProps);

export default WithLayout({
  Page: LegacyPage,
  getLayout: null,
  getData,
})<"P">;
