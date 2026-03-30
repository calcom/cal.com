import { _generateMetadata, getTranslate } from "app/_utils";

import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@coss/ui/shared/app-header";

import PasswordViewWrapper from "~/settings/security/password-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("password"),
    (t) => t("password_description"),
    undefined,
    undefined,
    "/settings/security/password"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <div>
      <AppHeader>
        <AppHeaderContent title={t("password")}>
          <AppHeaderDescription>
            {t("password_description")}
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <PasswordViewWrapper />
    </div>
  );
};

export default Page;

export const unstable_dynamicStaleTime = 30;
