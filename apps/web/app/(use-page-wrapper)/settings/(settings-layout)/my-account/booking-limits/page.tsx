import { _generateMetadata } from "app/_utils";
import { createRouterCaller } from "app/_trpc/context";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import BookingLimitsView from "~/settings/my-account/booking-limits-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("booking_limits"),
    (t) => t("booking_limits_global_description"),
    undefined,
    undefined,
    "/settings/my-account/booking-limits"
  );

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userId = session?.user?.id;
  const redirectUrl = "/auth/login?callbackUrl=/settings/my-account/general";

  if (!userId) {
    return redirect(redirectUrl);
  }

  const meCaller = await createRouterCaller(meRouter);
  const user = meCaller.get();

  if (!user) {
    redirect(redirectUrl);
  }
  return <BookingLimitsView user={user} />;
};

export default Page;
