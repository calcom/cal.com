import LegacyPage, { type SignupProps } from "@pages/signup";
import { withAppDir } from "app/AppDirSSRHOC";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/signup/getServerSideProps";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("sign_up"),
    (t) => t("sign_up")
  );

const getData = withAppDir<SignupProps>(getServerSideProps);

export default WithLayout({
  Page: LegacyPage,
  getLayout: null,
  getData,
})<"P">;
