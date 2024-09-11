import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import { getServerSideProps } from "@lib/settings/license-key/new/getServerSideProps";

import CreateANewLicenseKeyForm, { LayoutWrapper } from "~/settings/license-key/new/new-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("set_up_your_organization"),
    (t) => t("organizations_description")
  );

export default WithLayout({
  Page: CreateANewLicenseKeyForm,
  getLayout: LayoutWrapper,
  getData: withAppDirSsr<inferSSRProps<typeof getServerSideProps>>(getServerSideProps),
});
