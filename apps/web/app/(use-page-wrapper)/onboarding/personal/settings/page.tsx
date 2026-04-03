import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { APP_NAME } from "@calcom/lib/constants";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { EmbedPersonalSettingsView } from "~/onboarding/personal/settings/embed-personal-settings-view";
import { PersonalSettingsView } from "~/onboarding/personal/settings/personal-settings-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${APP_NAME} - ${t("personal_settings")}`,
    () => "",
    true,
    undefined,
    "/onboarding/personal/settings"
  );
};

type SearchParams = Record<string, string | string[] | undefined>;

const ServerPage = async ({ searchParams: searchParamsPromise }: { searchParams: Promise<SearchParams> }) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const searchParams = await searchParamsPromise;
  const userEmail = session.user.email || "";
  const userName = session.user.name || "";
  const fromTeamOnboarding = searchParams?.fromTeamOnboarding === "true";

  if (searchParams?.onboardingEmbed === "true") {
    const embedName = (searchParams?.name as string) || "";
    return <EmbedPersonalSettingsView userEmail={userEmail} userName={userName || embedName} />;
  }

  return (
    <PersonalSettingsView userEmail={userEmail} userName={userName} fromTeamOnboarding={fromTeamOnboarding} />
  );
};

export default ServerPage;
