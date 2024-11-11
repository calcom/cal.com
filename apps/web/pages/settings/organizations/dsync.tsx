"use client";

import DirectorySyncTeamView from "@calcom/features/ee/dsync/page/team-dsync-view";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const Page = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta title={t("directory_sync")} description={t("directory_sync_description")} />
      <DirectorySyncTeamView />
    </>
  );
};
Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
