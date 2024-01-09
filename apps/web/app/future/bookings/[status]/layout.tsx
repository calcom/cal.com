import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { notFound } from "next/navigation";
import { z } from "zod";

import { getLayout } from "@calcom/features/MainLayoutAppDir";
import { APP_NAME } from "@calcom/lib/constants";

import type { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { ssgInit } from "@server/lib/ssg";

const validStatuses = ["upcoming", "recurring", "past", "cancelled", "unconfirmed"] as const;

const querySchema = z.object({
  status: z.enum(validStatuses),
});

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => `${APP_NAME} | ${t("bookings")}`,
    () => ""
  );

export const generateStaticParams = async () => {
  return validStatuses.map((status) => ({ status }));
};

const getData = async (ctx: ReturnType<typeof buildLegacyCtx>) => {
  const parsedParams = querySchema.safeParse(ctx.params);

  if (!parsedParams.success) {
    notFound();
  }

  const ssg = await ssgInit(ctx);

  return {
    status: parsedParams.data.status,
    dehydratedState: ssg.dehydrate(),
  };
};

export default WithLayout({ getLayout, getData })<"L">;

export const dynamic = "force-static";
