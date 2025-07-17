import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { PhoneNumberRepository } from "@calcom/lib/server/repository/phoneNumber";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import PhoneNumbersQueryView from "~/settings/my-account/phone-numbers-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("cal_ai_phone_numbers"),
    (t) => t("cal_ai_phone_numbers_description"),
    undefined,
    undefined,
    "/settings/my-account/phone-numbers"
  );

const getCachedPhoneNumbers = unstable_cache(
  async (userId: number) => {
    return await PhoneNumberRepository.findPhoneNumbersFromUserId({ userId });
  },
  undefined,
  { revalidate: 3600, tags: ["viewer.phoneNumber.list"] } // Cache for 1 hour
);

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session) {
    redirect("/auth/login?callbackUrl=/settings/my-account/phone-numbers");
  }

  const userId = session.user.id;
  const revalidatePage = async () => {
    "use server";
    revalidatePath("settings/my-account/phone-numbers");
  };

  const cachedNumbers = await getCachedPhoneNumbers(userId);

  return <PhoneNumbersQueryView revalidatePage={revalidatePage} cachedNumbers={cachedNumbers} />;
};

export default Page;
