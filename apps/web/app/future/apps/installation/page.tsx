import type { OnboardingPageProps } from "@pages/apps/installation/[[...step]]";
import Page from "@pages/apps/installation/[[...step]]";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { APP_NAME } from "@calcom/lib/constants";

import { getServerSideProps } from "@lib/apps/installation/getServerSideProps";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => `Install ${APP_NAME}`,
    () => ""
  );
};

export default WithLayout({
  getData: withAppDirSsr<OnboardingPageProps>(getServerSideProps),
  Page,
  getLayout: null,
})<"P">;
