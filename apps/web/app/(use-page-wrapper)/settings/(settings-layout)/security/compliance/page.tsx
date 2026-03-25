import { _generateMetadata, getTranslate } from "app/_utils";

import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";

import ComplianceView from "~/settings/security/compliance-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("compliance"),
    (t) => t("compliance_description"),
    undefined,
    undefined,
    "/settings/security/compliance"
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <div>
      <AppHeader>
        <AppHeaderContent title={t("compliance")}>
          <AppHeaderDescription>{t("compliance_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <ComplianceView />
    </div>
  );
};

export default Page;
