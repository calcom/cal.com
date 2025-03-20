"use client";

import { useForm, Controller } from "react-hook-form";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole, RRResetInterval } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Label } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { Button } from "@calcom/ui/components/button";
import { Form } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

interface ProfileViewProps {
  team: RouterOutputs["viewer"]["teams"]["get"];
}

const RoundRobinResetInterval = ({ team }: ProfileViewProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const intervalOptions: {
    value: RRResetInterval;
    label: string;
  }[] = [
    {
      value: RRResetInterval.MONTH,
      label: t("monthly"),
    },
    {
      value: RRResetInterval.DAY,
      label: t("daily"),
    },
  ];

  const form = useForm<{ rrResetInterval: RRResetInterval }>({
    defaultValues: {
      rrResetInterval: team?.rrResetInterval ?? RRResetInterval.MONTH,
    },
  });

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess(res) {
      await utils.viewer.teams.get.invalidate();
      showToast(t("rr_interval_successfully_updated"), "success");
    },
  });

  const isAdmin =
    team && (team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN);

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
        mutation.mutate({ ...values, id: team.id });
      }}>
      <Controller
        name="rrResetInterval"
        render={({ field: { value, onChange } }) => {
          return (
            <div className="border-subtle mt-6 space-x-3 rounded-t-lg border border-b-0 px-4 py-6 sm:px-6">
              <div>
                <h4 className="text-emphasis text-sm font-semibold leading-5">{t("rr_reset_interval")}</h4>
                <p className="text-default text-sm leading-tight">{t("rr_reset_interval_description")}</p>
                <div className="-mx-4 mt-4 border-t sm:-mx-6">
                  <div className="px-4 pt-6 sm:px-6">
                    <Label>{t("interval")}</Label>
                    <Select
                      options={intervalOptions}
                      value={intervalOptions.find((opt) => opt.value === value)}
                      onChange={(val) => {
                        onChange(val?.value);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        }}
      />
      <SectionBottomActions align="end">
        <Button type="submit" color="primary" loading={mutation.isPending}>
          {t("update")}
        </Button>
      </SectionBottomActions>
    </Form>
  );
};

export default RoundRobinResetInterval;
