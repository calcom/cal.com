import { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import UsersAddView from "@calcom/features/ee/users/pages/users-add-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("add_new_user"), t("admin_users_add_description"));
};
const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

  return (
    <SettingsHeader title={t("add_new_user")} description={t("admin_users_add_description")}>
      <UsersAddView />
    </SettingsHeader>
  );
};

export default Page;
