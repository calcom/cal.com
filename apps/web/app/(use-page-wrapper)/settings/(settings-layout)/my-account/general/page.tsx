import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { TravelScheduleRepository } from "@calcom/lib/server/repository/travelSchedule";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { unstable_cache } from "@calcom/lib/unstable_cache";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { GeneralView } from "~/settings/my-account/general-view";

import { revalidatePage } from "./actions";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("general"),
    (t) => t("general_description"),
    undefined,
    undefined,
    "/settings/my-account/general"
  );

const getCachedUser = unstable_cache(
  async ({ upId, userId }: { upId: string; userId: number }) => {
    return await UserRepository.getMe({
      userId,
      upId,
    });
  },
  undefined,
  { revalidate: 3600, tags: ["viewer.me.get"] }
);

const getCachedUserTravelSchedules = unstable_cache(
  async (userId: number) => {
    return await TravelScheduleRepository.findTravelSchedulesByUserId(userId);
  },
  undefined,
  { revalidate: 3600, tags: ["viewer.travelSchedules.get"] }
);

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const user = await getCachedUser({ upId: session.upId, userId: session.user.id });
  if (!user) {
    redirect("/auth/login");
  }

  const travelSchedules = (await getCachedUserTravelSchedules(session.user.id)) ?? [];
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("general")} description={t("general_description")} borderInShellHeader={true}>
      <GeneralView
        revalidatePage={revalidatePage}
        travelSchedules={travelSchedules}
        localeProp={user.locale}
        user={user}
      />
    </SettingsHeader>
  );
};

export default Page;
