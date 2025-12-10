import { _generateMetadata } from "app/_utils";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import FeaturesView from "~/settings/my-account/features-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("features"),
    (t) => t("features_description"),
    undefined,
    undefined,
    "/settings/my-account/features"
  );

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userId = session?.user?.id;
  const redirectUrl = "/auth/login?callbackUrl=/settings/my-account/features";

  if (!userId) {
    return redirect(redirectUrl);
  }

  return <FeaturesView />;
};

export default Page;
