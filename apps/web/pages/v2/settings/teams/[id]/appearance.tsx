import { MembershipRole } from "@prisma/client";
import { useRouter } from "next/router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import objectKeys from "@calcom/lib/objectKeys";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import {
  Button,
  Checkbox,
  Dialog,
  DialogTrigger,
  Form,
  showToast,
  Switch,
  TextField,
} from "@calcom/ui/v2/core";
import Avatar from "@calcom/ui/v2/core/Avatar";
import ConfirmationDialogContent from "@calcom/ui/v2/core/ConfirmationDialogContent";
import Meta from "@calcom/ui/v2/core/Meta";
import { Label, TextArea } from "@calcom/ui/v2/core/form/fields";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";

import ImageUploader from "@components/v2/settings/ImageUploader";

interface TeamAppearanceValues {
  hideBranding: boolean;
}

const ProfileView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();

  const mutation = trpc.useMutation("viewer.teams.update", {
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess() {
      await utils.invalidateQueries(["viewer.teams.get"]);
      showToast(t("your_team_updated_successfully"), "success");
    },
  });

  const form = useForm<TeamAppearanceValues>();

  const { data: team, isLoading } = trpc.useQuery(["viewer.teams.get", { teamId: Number(router.query.id) }], {
    onError: () => {
      router.push("/settings");
    },
    onSuccess: (team) => {
      if (team) {
        form.setValue("hideBranding", team.hideBranding);
      }
    },
  });

  const isAdmin =
    team && (team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN);

  return (
    <>
      {!isLoading && (
        <>
          <Meta title="booking_appearance" description="appearance_team_description" />
          {isAdmin ? (
            <Form
              form={form}
              handleSubmit={(values) => {
                if (team) {
                  const hideBranding = form.getValues("hideBranding");
                  if (team.hideBranding !== hideBranding) {
                    mutation.mutate({ id: team.id, hideBranding });
                  }
                }
              }}>
              <div className="relative flex items-start">
                <div className="flex-grow text-sm">
                  <label htmlFor="hide-branding" className="font-medium text-gray-700">
                    {t("disable_cal_branding")}
                  </label>
                  <p className="text-gray-500">{t("team_disable_cal_branding_description")}</p>
                </div>
                <div className="flex-none">
                  <Controller
                    control={form.control}
                    name="hideBranding"
                    render={({ field }) => (
                      <Switch
                        defaultChecked={field.value}
                        onCheckedChange={(isChecked) => {
                          form.setValue("hideBranding", isChecked);
                        }}
                      />
                    )}
                  />
                </div>
              </div>
              <Button color="primary" className="mt-8" type="submit" loading={mutation.isLoading}>
                {t("update")}
              </Button>
            </Form>
          ) : (
            <div className="rounded-md border border-gray-200 p-5">
              <span className="text-sm text-gray-600">{t("only_owner_change")}</span>
            </div>
          )}
        </>
      )}
    </>
  );
};

ProfileView.getLayout = getLayout;

export default ProfileView;
