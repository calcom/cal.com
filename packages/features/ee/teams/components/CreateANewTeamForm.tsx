import { useRouter } from "next/router";
import { Controller, useForm } from "react-hook-form";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Avatar, Button } from "@calcom/ui/components";
import { Form, TextField } from "@calcom/ui/components/form";
import ImageUploader from "@calcom/ui/v2/core/ImageUploader";

import { NewTeamFormValues } from "../lib/types";

export const CreateANewTeamForm = () => {
  const { t } = useLocale();
  const router = useRouter();
  const newTeamFormMethods = useForm<NewTeamFormValues>();

  const createTeamMutation = trpc.viewer.teams.create.useMutation({
    onSuccess: (data) => {
      router.push(`/settings/teams/${data.id}/onboard-members`);
    },
  });

  const validateTeamSlugQuery = trpc.viewer.teams.validateTeamSlug.useQuery(
    { slug: newTeamFormMethods.watch("slug") },
    {
      enabled: false,
      refetchOnWindowFocus: false,
    }
  );

  const validateTeamSlug = async () => {
    await validateTeamSlugQuery.refetch();
    if (validateTeamSlugQuery.isFetched) return validateTeamSlugQuery.data || t("team_url_taken");
  };

  return (
    <>
      <Form
        form={newTeamFormMethods}
        handleSubmit={(v) => {
          if (!createTeamMutation.isLoading) createTeamMutation.mutate(v);
        }}>
        <div className="mb-8">
          <Controller
            name="name"
            control={newTeamFormMethods.control}
            defaultValue=""
            rules={{
              required: t("must_enter_team_name"),
            }}
            render={({ field: { value } }) => (
              <>
                <TextField
                  className="mt-2"
                  name="name"
                  label={t("team_name")}
                  value={value}
                  onChange={(e) => {
                    newTeamFormMethods.setValue("name", e?.target.value);
                    if (newTeamFormMethods.formState.touchedFields["slug"] === undefined) {
                      newTeamFormMethods.setValue("slug", slugify(e?.target.value));
                    }
                  }}
                  autoComplete="off"
                />
              </>
            )}
          />
        </div>

        <div className="mb-8">
          <Controller
            name="slug"
            control={newTeamFormMethods.control}
            rules={{ required: t("team_url_required"), validate: async () => await validateTeamSlug() }}
            render={({ field: { value } }) => (
              <TextField
                className="mt-2"
                name="slug"
                label={t("team_url")}
                addOnLeading={`${WEBAPP_URL}/team/`}
                value={value}
                onChange={(e) => {
                  newTeamFormMethods.setValue("slug", slugify(e?.target.value), {
                    shouldTouch: true,
                  });
                }}
              />
            )}
          />
        </div>

        <div className="mb-8">
          <Controller
            control={newTeamFormMethods.control}
            name="logo"
            render={({ field: { value } }) => (
              <div className="flex items-center">
                <Avatar alt="" imageSrc={value || null} gravatarFallbackMd5="newTeam" size="lg" />
                <div className="ml-4">
                  <ImageUploader
                    target="avatar"
                    id="avatar-upload"
                    buttonMsg={t("update")}
                    handleAvatarChange={(newAvatar: string) => {
                      newTeamFormMethods.setValue("logo", newAvatar);
                    }}
                    imageSrc={value}
                  />
                </div>
              </div>
            )}
          />
        </div>

        <div className="flex space-x-2">
          <Button
            disabled={createTeamMutation.isLoading}
            color="secondary"
            href="/settings"
            className="w-full justify-center">
            {t("cancel")}
          </Button>
          <Button
            disabled={createTeamMutation.isLoading}
            color="primary"
            type="submit"
            EndIcon={Icon.FiArrowRight}
            className="w-full justify-center">
            {t("continue")}
          </Button>
        </div>
        {createTeamMutation.isError && (
          <p className="mt-4 text-red-700">{createTeamMutation.error.message}</p>
        )}
      </Form>
    </>
  );
};
