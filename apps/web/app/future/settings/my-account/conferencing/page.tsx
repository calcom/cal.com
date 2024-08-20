import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";
import { getServerSession } from "next-auth";

import { AUTH_OPTIONS } from "@calcom/feature-auth/lib/next-auth-options";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { Button } from "@calcom/ui";

import ConferencingView from "~/settings/my-account/conferencing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("conferencing"),
    (t) => t("conferencing_description")
  );

const Page = async () => {
  const session = await getServerSession(AUTH_OPTIONS);
  const t = await getFixedT(session?.user.locale || "en");

  const AddConferencingButton = () => {
    return (
      <Button color="secondary" StartIcon="plus" href="/apps/categories/conferencing">
        {t("add")}
      </Button>
    );
  };

  return (
    <SettingsHeader
      title={t("conferencing")}
      description={t("conferencing_description")}
      CTA={<AddConferencingButton />}
      borderInShellHeader={true}>
      <ConferencingView />
    </SettingsHeader>
  );
};

export default Page;
