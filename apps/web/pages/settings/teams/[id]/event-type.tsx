"use client";

import Head from "next/head";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import PageWrapper from "@components/PageWrapper";

import CreateTeamEventType, { GetLayout } from "~/settings/teams/[id]/event-types-view";

const TeamEventTypePage = () => {
  const { t } = useLocale();
  return (
    <>
      <Head>
        <title>{t("add_new_team_event_type")}</title>
        <meta name="description" content={t("new_event_type_to_book_description")} />
      </Head>
      <CreateTeamEventType />
    </>
  );
};

TeamEventTypePage.getLayout = GetLayout;
TeamEventTypePage.PageWrapper = PageWrapper;

export default TeamEventTypePage;
