"use client";

import Head from "next/head";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import PageWrapper from "@components/PageWrapper";

import CreateNewTeamView, { LayoutWrapper } from "~/settings/teams/new/create-new-team-view";

const CreateNewTeamPage = () => {
  const { t } = useLocale();

  return (
    <>
      <Head>
        <title>{t("create_new_team")}</title>
        <meta name="description" content={t("create_new_team_description")} />
      </Head>
      <CreateNewTeamView />
    </>
  );
};

CreateNewTeamPage.getLayout = LayoutWrapper;
CreateNewTeamPage.PageWrapper = PageWrapper;

export default CreateNewTeamPage;
