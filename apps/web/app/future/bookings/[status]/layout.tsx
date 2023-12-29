import { ssgInit } from "app/_trpc/ssgInit";
import type { Params } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { z } from "zod";

import { getLayout } from "@calcom/features/MainLayoutAppDir";
import { APP_NAME } from "@calcom/lib/constants";

import PageWrapper from "@components/PageWrapperAppDir";

const validStatuses = ["upcoming", "recurring", "past", "cancelled", "unconfirmed"] as const;

const querySchema = z.object({
  status: z.enum(validStatuses),
});

type Props = { params: Params; children: ReactElement };

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => `${APP_NAME} | ${t("bookings")}`,
    () => ""
  );

export const generateStaticParams = async () => {
  return validStatuses.map((status) => ({ status }));
};

const getData = async ({ params }: { params: Params }) => {
  const parsedParams = querySchema.safeParse(params);

  if (!parsedParams.success) {
    notFound();
  }

  const ssg = await ssgInit();

  return {
    status: parsedParams.data.status,
    dehydratedState: await ssg.dehydrate(),
  };
};

export default async function BookingPageLayout({ params, children }: Props) {
  const props = await getData({ params });

  return (
    <PageWrapper requiresLicense={false} getLayout={getLayout} nonce={undefined} themeBasis={null} {...props}>
      {children}
    </PageWrapper>
  );
}

export const dynamic = "force-static";
