"use client";

import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import TeamsView, { TeamsCTA } from "~/teams/teams-view";

const ClientPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const session = useSession();
  const _token = searchParams?.get("token");
  const token = Array.isArray(_token) ? _token[0] : _token;
  const callbackUrl = token ? `/teams?token=${encodeURIComponent(token)}` : null;
  if (session.status !== "loading" && !session.data?.user) {
    router.push(callbackUrl ? `/auth/login?callbackUrl=${callbackUrl}` : "/auth/login");
  }

  const { t } = useLocale();

  return (
    <ShellMainAppDir
      CTA={<TeamsCTA />}
      heading={t("teams")}
      subtitle={t("create_manage_teams_collaborative")}>
      <TeamsView />
    </ShellMainAppDir>
  );
};

export default ClientPage;
