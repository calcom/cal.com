"use client";

import Head from "next/head";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import PageWrapper from "@components/PageWrapper";

import AddNewTeamMembers, { GetLayout } from "~/settings/teams/[id]/onboard-members-view";

const OnboardTeamMembersPage = () => {
  const { t } = useLocale();
  return (
    <>
      <Head>
        <title>{t("add_team_members")}</title>
        <meta name="description" content={t("add_team_members_description")} />
      </Head>
      <AddNewTeamMembers />
    </>
  );
};

OnboardTeamMembersPage.getLayout = GetLayout;
OnboardTeamMembersPage.PageWrapper = PageWrapper;

export default OnboardTeamMembersPage;
