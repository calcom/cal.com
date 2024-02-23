import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import PaymentPage from "@calcom/features/ee/payments/components/PaymentPage";
import { getServerSideProps, type PaymentPageProps } from "@calcom/features/ee/payments/pages/payment";
import { APP_NAME } from "@calcom/lib/constants";

export const generateMetadata = async () =>
  await _generateMetadata(
    // the title does not contain the eventName as in the legacy page
    (t) => `${t("payment")} | ${APP_NAME}`,
    () => ""
  );

const getData = withAppDirSsr<PaymentPageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, getData, Page: PaymentPage });
