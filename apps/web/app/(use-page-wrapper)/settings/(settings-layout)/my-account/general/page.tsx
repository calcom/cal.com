import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";
import { getTravelSchedule } from "@calcom/web/app/cache/travelSchedule";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import GeneralView from "~/settings/my-account/general-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("general"),
    (t) => t("general_description"),
    undefined,
    undefined,
    "/settings/my-account/general"
  );

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userId = session?.user?.id;
  const redirectUrl = "/auth/login?callbackUrl=/settings/my-account/general";

  if (!userId) {
    return redirect(redirectUrl);
  }

  const meCaller = await createRouterCaller(meRouter);
  const [user, travelSchedules] = await Promise.all([meCaller.get(), getTravelSchedule(userId)]);
  if (!user) {
    redirect(redirectUrl);
  }
  return <GeneralView user={user} travelSchedules={travelSchedules ?? []} />;
};

export default Page;
