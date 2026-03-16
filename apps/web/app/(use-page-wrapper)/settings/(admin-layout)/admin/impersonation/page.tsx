import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@coss/ui/shared/app-header";
import ImpersonationView from "~/settings/admin/impersonation-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("admin"),
    (t) => t("impersonation"),
    undefined,
    undefined,
    "/settings/admin/impersonation"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <div>
      <AppHeader>
        <AppHeaderContent title={t("admin")}>
          <AppHeaderDescription>{t("impersonation")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <ImpersonationView />
    </div>
  );
};

export default Page;
