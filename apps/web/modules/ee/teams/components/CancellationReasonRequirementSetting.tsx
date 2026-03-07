"use client";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CancellationReasonRequirement } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Form } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { Controller, useForm } from "react-hook-form";

interface CancellationReasonRequirementSettingProps {
  team: RouterOutputs["viewer"]["teams"]["get"];
}

const CancellationReasonRequirementSetting = ({ team }: CancellationReasonRequirementSettingProps) => {
  const { t } = useLocale();
  const isAdmin = team && checkAdminOrOwner(team.membership.role);
  const utils = trpc.useUtils();

  const cancellationReasonOptions = [
  { value: CancellationReasonRequirement.MANDATORY_BOTH, label: t("mandatory_for_both") },
  { value: CancellationReasonRequirement.MANDATORY_HOST_ONLY, label: t("mandatory_for_host_only") },
  { value: CancellationReasonRequirement.MANDATORY_ATTENDEE_ONLY, label: t("mandatory_for_attendee_only") },
  { value: CancellationReasonRequirement.OPTIONAL_BOTH, label: t("optional_for_both") },
];

  const initialValue = team?.requiresCancellationReason ?? CancellationReasonRequirement.MANDATORY_HOST_ONLY;

  const form = useForm<{ requiresCancellationReason: CancellationReasonRequirement }>({
    defaultValues: {
      requiresCancellationReason: initialValue,
    },
  });

  const watchedValue = form.watch("requiresCancellationReason");
  const hasChanges = watchedValue !== initialValue;

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      showToast(t("cancellation_reason_requirement_updated_successfully"), "success");
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
          requiresCancellationReason: values.requiresCancellationReason,
        });
      }}>
      <div className="border-subtle mt-6 space-x-3 rounded-t-lg border border-b-0 px-4 py-6 pb-0 sm:px-6">
        <div>
          <h4 className="text-emphasis text-sm font-semibold leading-5">
            {t("cancellation_reason_requirement")}
          </h4>
          <p className="text-default text-sm leading-tight">
            {t("cancellation_reason_requirement_description")}
          </p>
          <div className="-mx-4 mt-4 sm:-mx-6">
            <div className="border-subtle border-t px-6 py-6">
              <Controller
                name="requiresCancellationReason"
                control={form.control}
                render={({ field: { value, onChange } }) => (
                  <Select
                    value={cancellationReasonOptions.find((opt) => opt.value === value)}
                    options={cancellationReasonOptions}
                    onChange={(selected) => onChange(selected?.value)}
                    className="w-52"
                  />
                )}
              />
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

export default CancellationReasonRequirementSetting;
