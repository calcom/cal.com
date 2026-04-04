"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "next-i18next";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const getFormSchema = (t: TFunction) => {
  return z.object({
    teamId: z.number(),
    targetOrgId: z.number(),
    teamSlugInOrganization: z.string().min(1),
  });
};

export default function MoveTeamToOrgView() {
  const { t } = useLocale();
  const formSchema = getFormSchema(t);
  const formMethods = useForm({
    mode: "onSubmit",
    resolver: zodResolver(formSchema),
  });

  const moveTeamMutation = trpc.viewer.admin.moveTeamToOrg.useMutation({
    onSuccess: (data) => {
      showToast(t(data.message), "success", 10000);
    },
    onError: (error) => {
      showToast(t(error.message), "error", 10000);
    },
  });

  const { register } = formMethods;
  return (
    <div className="space-y-3">
      <Form
        className="space-y-3"
        noValidate={true}
        form={formMethods}
        handleSubmit={async (values) => {
          const parsedValues = formSchema.parse(values);
          moveTeamMutation.mutate(parsedValues);
        }}>
        <div className="space-y-3">
          <TextField
            {...register("teamId", { valueAsNumber: true })}
            type="number"
            label={t("team_id")}
            required
            placeholder={t("move_team_to_org_team_id_placeholder")}
          />
          <TextField
            {...register("teamSlugInOrganization")}
            label={t("move_team_to_org_new_slug")}
            required
            placeholder={t("move_team_to_org_new_slug_placeholder")}
          />
          <TextField
            {...register("targetOrgId", { valueAsNumber: true })}
            type="number"
            label={t("move_team_to_org_target_org_id")}
            required
            placeholder={t("move_team_to_org_target_org_id_placeholder")}
          />
          <div className="mt-2 text-gray-600 text-sm">
            {t("organization_migration_move_team_footnote")}
          </div>
        </div>
        <Button type="submit" loading={moveTeamMutation.isPending}>
          {t("organization_migration_move_team")}
        </Button>
      </Form>

      {moveTeamMutation.isSuccess && moveTeamMutation.data && (
        <Alert
          className="mt-6"
          severity="info"
          CustomIcon="check"
          title={t("move_team_to_org_migration_successful")}
          message={
            <div className="space-y-1">
              <p>
                <span className="font-medium">{t("team_id")}:</span> {moveTeamMutation.data.teamId}
              </p>
              {moveTeamMutation.data.oldTeamSlug && (
                <p>
                  <span className="font-medium">{t("move_team_to_org_old_slug")}:</span>{" "}
                  {moveTeamMutation.data.oldTeamSlug}
                </p>
              )}
              {moveTeamMutation.data.newTeamSlug && (
                <p>
                  <span className="font-medium">{t("move_team_to_org_new_slug")}:</span>{" "}
                  {moveTeamMutation.data.newTeamSlug}
                </p>
              )}
              <p>
                <span className="font-medium">{t("organization_id")}:</span>{" "}
                {moveTeamMutation.data.organizationId}
              </p>
              {moveTeamMutation.data.organizationSlug && (
                <p>
                  <span className="font-medium">{t("move_team_to_org_organization_slug")}:</span>{" "}
                  {moveTeamMutation.data.organizationSlug}
                </p>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}
