import Page from "@pages/bookings/[status]";
import { withAppDirSsg } from "app/WithAppDirSsg";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import type { InferGetStaticPropsType } from "next";

import { getLayout } from "@calcom/features/MainLayoutAppDir";
import { APP_NAME } from "@calcom/lib/constants";

import { getStaticProps } from "@lib/bookings/[status]/getStaticProps";

const validStatuses = ["upcoming", "recurring", "past", "cancelled", "unconfirmed"] as const;

type Y = InferGetStaticPropsType<typeof getStaticProps>;
const getData = withAppDirSsg<Y>(getStaticProps);

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => `${APP_NAME} | ${t("bookings")}`,
    () => ""
  );

export const generateStaticParams = async () => {
  return validStatuses.map((status) => ({ status }));
};

export default WithLayout({ getLayout, getData, Page })<"P">;

export const dynamic = "force-static";
