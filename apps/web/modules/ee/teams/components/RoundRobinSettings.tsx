"use client";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RRResetInterval, RRTimestampBasis } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Form } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { revalidateTeamDataCache } from "@calcom/web/app/(booking-page-wrapper)/team/[slug]/[type]/actions";
import { useForm } from "react-hook-form";
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

  const initialResetInterval = rrResetInterval ?? RRResetInterval.MONTH;
  const initialTimestampBasis = team?.rrTimestampBasis ?? RRTimestampBasis.CREATED_AT;

  const form = useForm<{ rrResetInterval: RRResetInterval; rrTimestampBasis: RRTimestampBasis }>({
    defaultValues: {
      rrResetInterval: initialResetInterval,
      rrTimestampBasis: initialTimestampBasis,
    },
  });

  const [watchedResetInterval, watchedTimestampBasis] = form.watch(["rrResetInterval", "rrTimestampBasis"]);
  const hasChanges =
    watchedResetInterval !== initialResetInterval || watchedTimestampBasis !== initialTimestampBasis;

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      if (team?.slug) {
        // Rounb robin reset interval / basis governs host selection logic on the booking page.
        revalidateTeamDataCache({
          teamSlug: team.slug,
          orgSlug: team.parent?.slug ?? null,
        });
      }
      showToast(t("round_robin_settings_updated_successfully"), "success");
    },
  });

  if (!isAdmin) {
    return (
      <div className="border-subtle rounded-md border p-5">
        <span className="text-default text-sm">{t("only_owner_change")}</span>
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
      <div className="border-subtle mt-6 space-x-3 rounded-t-lg border border-b-0 px-4 py-6 pb-0 sm:px-6">
        {" "}
        <div>
          <h4 className="text-emphasis text-sm font-semibold leading-5">{t("round_robin")}</h4>
          <p className="text-default text-sm leading-tight">{t("round_robin_settings_description")}</p>
          <div className="-mx-4 mt-4 sm:-mx-6">
            <div className="border-subtle border-t px-6 py-6">
              <RoundRobinResetInterval />
            </div>
            <div className="border-subtle border-t" />
            <div className="border-subtle px-6 py-6">
              <RoundRobinTimestampBasis />
            </div>
          </div>
        </div>
      </div>
      <SectionBottomActions align="end">
        <Button type="submit" disabled={!hasChanges} color="primary" loading={mutation.isPending}>
          {t("update")}
        </Button>
      </SectionBottomActions>
    </Form>
  );
};

export default RoundRobinSettings;
