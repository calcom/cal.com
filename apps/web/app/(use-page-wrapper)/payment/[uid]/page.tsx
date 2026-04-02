import { getServerSideProps, type PaymentPageProps } from "@calcom/features/ee/payments/pages/payment";
import { APP_NAME } from "@calcom/lib/constants";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { cookies, headers } from "next/headers";
import PaymentPage from "./PaymentPage";

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

  return <PaymentPage {...props} />;
};
export default ServerPage;
