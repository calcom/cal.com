import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import PaymentPage from "@calcom/features/ee/payments/components/PaymentPage";
import { getServerSideProps, type PaymentPageProps } from "@calcom/features/ee/payments/pages/payment";
import { APP_NAME } from "@calcom/lib/constants";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const props = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));
  const eventName = props.booking.title;
  return await _generateMetadata(
    (t) => `${t("payment")} | ${eventName} | ${APP_NAME}`,
    () => ""
  );
};

const getData = withAppDirSsr<PaymentPageProps>(getServerSideProps);

export default WithLayout({ getLayout: null, getData, Page: PaymentPage });
