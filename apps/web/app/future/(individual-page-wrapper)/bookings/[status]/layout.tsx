import { ssgInit } from "app/_trpc/ssgInit";
import { _generateMetadata } from "app/_utils";
import { headers } from "next/headers";
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

type Params = { status: string };
type Props = { params: Params; children: ReactElement };

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => `${APP_NAME} | ${t("bookings")}`,
    () => ""
  );

const getData = async ({ params }: { params: Params }) => {
  const parsedParams = querySchema.safeParse(params);
  const ssg = await ssgInit();

  if (!parsedParams.success) {
    return notFound();
  }

  return {
    status: parsedParams.data.status,
    dehydratedState: await ssg.dehydrate(),
  };
};

export default async function BookingPageLayout({ params, children }: Props) {
  const props = await getData({ params });
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <PageWrapper requiresLicense={false} getLayout={getLayout} nonce={nonce} themeBasis={null} {...props}>
      {children}
    </PageWrapper>
  );
}
