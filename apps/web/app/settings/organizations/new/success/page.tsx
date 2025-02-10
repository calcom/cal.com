import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@lib/settings/organizations/new/getServerSideProps";
import { type inferSSRProps } from "@lib/types/inferSSRProps";

import LegacyPage, { LayoutWrapper } from "~/settings/organizations/new/payment-success-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organization_payment_success"),
    (t) => t("organization_payment_success_description")
  );

export default WithLayout({
  requiresLicense: true,
  getLayout: LayoutWrapper,
  Page: LegacyPage,
  getData: withAppDirSsr<inferSSRProps<typeof getServerSideProps>>(getServerSideProps),
});
