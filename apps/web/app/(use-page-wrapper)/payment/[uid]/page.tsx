import { withAppDirSsr } from "app/WithAppDirSsr";
import { redirect } from "next/navigation";
import { getPaymentAppData } from "@calcom/lib/getPaymentAppData";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import PaymentPage from "@calcom/features/ee/payments/components/PaymentPage";
import { getServerSideProps, type PaymentPageProps } from "@calcom/features/ee/payments/pages/payment";
import { APP_NAME } from "@calcom/lib/constants";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );
  const eventName = props.booking.title;
  return await _generateMetadata(
    (t) => `${t("payment")} | ${eventName} | ${APP_NAME}`,
    () => "",
    undefined,
    undefined,
    `/payment/${(await params).uid}`
  );
};

const getData = withAppDirSsr<PaymentPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: PageProps) => {
  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );

  // console.log("Payment app data:" , paymentAppData, await searchParams, await params);

  // if(paymentAppData.appId === "razorpay") {
  //   redirect(
  //     `/booking/${(await params).uid}/razorpay`
  //   );
  // }

  return <PaymentPage {...props} />;
};
export default ServerPage;
