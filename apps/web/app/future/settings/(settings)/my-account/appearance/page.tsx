import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";
import { getServerSession } from "next-auth";

import { AUTH_OPTIONS } from "@calcom/feature-auth/lib/next-auth-options";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import AppearanceViewWrapper from "~/settings/my-account/appearance-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("appearance"),
    (t) => t("appearance_description")
  );

const Page = async () => {
  const session = await getServerSession(AUTH_OPTIONS);
  const t = await getFixedT(session?.user.locale || "en");

  return (
    <SettingsHeader title={t("appearance")} description={t("appearance_description")}>
      <AppearanceViewWrapper />
    </SettingsHeader>
  );
};

export default Page;
