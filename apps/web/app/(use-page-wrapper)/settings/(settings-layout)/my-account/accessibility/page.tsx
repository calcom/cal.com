import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import AccessibilityView from "~/settings/my-account/accessibility-view";

const generateMetadata = async (): Promise<Metadata> =>
  await _generateMetadata(
    (t) => t("accessibility"),
    (t) => t("accessibility_description"),
    undefined,
    undefined,
    "/settings/my-account/accessibility"
  );

const Page = async (): Promise<ReactElement> => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/settings/my-account/accessibility");
  }

  return <AccessibilityView />;
};

export { generateMetadata };
export default Page;
