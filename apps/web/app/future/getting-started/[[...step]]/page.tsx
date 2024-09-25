import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { APP_NAME } from "@calcom/lib/constants";

import { getServerSideProps } from "@lib/getting-started/[[...step]]/getServerSideProps";

import type { PageProps } from "~/getting-started/[[...step]]/onboarding-view";
import Page from "~/getting-started/[[...step]]/onboarding-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${APP_NAME} - ${t("getting_started")}`,
    () => "",
    true
  );
};

export default WithLayout({
  getLayout: null,
  getData: withAppDirSsr<PageProps>(getServerSideProps),
  Page,
});
