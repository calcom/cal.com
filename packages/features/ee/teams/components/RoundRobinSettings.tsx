"use client";

import { useForm } from "react-hook-form";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RRResetInterval, RRTimestampBasis } from "@calcom/prisma/client";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Form } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import RoundRobinResetInterval from "./RoundRobinResetInterval";
import RoundRobinTimestampBasis from "./RoundRobinTimestampBasis";

interface RoundRobinSettingsProps {
  team: RouterOutputs["viewer"]["teams"]["get"];
}

const RoundRobinSettings = ({ team }: RoundRobinSettingsProps) => {
  const { t } = useLocale();
  const isAdmin = team && checkAdminOrOwner(team.membership.role);
  const rrResetInterval = team?.rrResetInterval ?? undefined;
  const utils = trpc.useUtils();

  const form = useForm<{ rrResetInterval: RRResetInterval; rrTimestampBasis: RRTimestampBasis }>({
    defaultValues: {
      rrResetInterval: rrResetInterval ?? RRResetInterval.MONTH,
      rrTimestampBasis: team?.rrTimestampBasis ?? RRTimestampBasis.CREATED_AT,
    },
  });

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      showToast(t("round_robin_settings_updated_successfully"), "success");
    },
  });

  if (!isAdmin) {
    return (
      <div className="er-sub-subtletle bor pd5 rounded-md">
        <span className="text-text-sm text-sm">{t("only_owner_change")}</span>
      </div>
    );
  }

  return (
    <Form
      form={form}
      handleSubmit={(values) => {
        mutation.mutate({
          id: team.id,
          rrResetInterval: values.rrResetInterval,
          rrTimestampBasis: values.rrTimestampBasis,
        });
      }}>
      <div className="borderrsultlemt-6 rounded-t-lgrounded-t-lg borderpx-4 py-6ppx-0 space-x-3 sm:px-6">
        <div>
          <h4 className="text-emphasis font-semi text-sm">{t("round_robin")}</h4>
          <p className="text-default text-sm ">{t("round_robin_settings_description")}</p>
          <div className="--xx-4mt-4 sm:-mx-6">
            <div className="tle borsubdleer-t px-y px-6 py-6">
              <RoundRobinResetInterval team={team} />
            </div>
            <div className="bord-ssubulebtle ebor" />

            <div className="tle px-6 py-6">
              <RoundRobinTimestampBasis team={team} />
            </div>
          </div>
        </div>
      </div>
      <SectionBottomActions align="end">
        <Button type="submit" color="primary" loading={mutation.isPending}>
          {t("update")}
        </Button>
      </SectionBottomActions>
    </Form>
  );
};

export default RoundRobinSettings;
