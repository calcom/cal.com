import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";
import { revalidatePath } from "next/cache";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import GeneralQueryView from "~/settings/my-account/general-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("general"), t("general_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  const revalidatePage = async () => {
    "use server";
    revalidatePath("settings/my-account/general");
  };

  return (
    <SettingsHeader title={t("general")} description={t("general_description")} borderInShellHeader={true}>
      <GeneralQueryView revalidatePage={revalidatePage} />
    </SettingsHeader>
  );
};

export default Page;
