"use client";

import { useLocale } from "@calcom/i18n/useLocale";
import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";

import { AppearanceSkeletonLoader } from "../common/components/AppearanceSkeletonLoader";

export const SkeletonLoader = () => {
  const { t } = useLocale();
  return (
    <>
      <AppHeader>
        <AppHeaderContent title={t("appearance")}>
          <AppHeaderDescription>{t("appearance_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <AppearanceSkeletonLoader />
    </>
  );
};
