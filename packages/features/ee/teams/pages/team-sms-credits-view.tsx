"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppearanceSkeletonLoader } from "@calcom/features/ee/components/CommonSkeletonLoaders";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Meta } from "@calcom/ui";

import { getLayout } from "../../../settings/layouts/SettingsLayout";

type ProfileViewProps = { team: RouterOutputs["viewer"]["teams"]["get"] };

const SmsCreditsView = ({ team }: ProfileViewProps) => {
  const { t } = useLocale();

  const isAdmin =
    team && (team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN);

  return (
    <>
      <Meta
        title={t("sms_credits")}
        description={t("managed_sms_credit_allocation")}
        borderInShellHeader={false}
      />
      {isAdmin ? (
        <div className="py-5">content here</div>
      ) : (
        <div className="border-subtle rounded-md border p-5">
          <span className="text-default text-sm">{t("only_owner_change")}</span>
        </div>
      )}
    </>
  );
};

const SmsCreditsViewWrapper = () => {
  const router = useRouter();
  const params = useParamsWithFallback();

  const { t } = useLocale();

  const { data: team, isPending, error } = trpc.viewer.teams.get.useQuery({ teamId: Number(params.id) });

  useEffect(
    function refactorMeWithoutEffect() {
      if (error) {
        router.replace("/teams");
      }
    },
    [error]
  );

  if (isPending)
    return (
      <AppearanceSkeletonLoader title={t("appearance")} description={t("appearance_team_description")} />
    );

  if (!team) return null;

  return <SmsCreditsView team={team} />;
};

SmsCreditsViewWrapper.getLayout = getLayout;

export default SmsCreditsViewWrapper;
