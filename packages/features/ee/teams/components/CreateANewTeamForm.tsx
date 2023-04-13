import { useRouter } from "next/router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { trpc } from "@calcom/trpc/react";
import { Avatar, Button, Form, ImageUploader, TextField, Alert } from "@calcom/ui";
import { ArrowRight } from "@calcom/ui/components/icon";

import type { NewTeamFormValues } from "../lib/types";

const querySchema = z.object({
  returnTo: z.string(),
});

export const CreateANewTeamForm = () => {
  const { t } = useLocale();
  const router = useRouter();
  const telemetry = useTelemetry();
  const returnToParsed = querySchema.safeParse(router.query);
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);

  const returnToParam =
    (returnToParsed.success ? getSafeRedirectUrl(returnToParsed.data.returnTo) : "/settings/teams") ||
    "/settings/teams";

  const newTeamFormMethods = useForm<NewTeamFormValues>();

  const createTeamMutation = trpc.viewer.teams.create.useMutation({
    onSuccess: (data) => {
      telemetry.event(telemetryEventTypes.team_created);
      router.push(`/settings/teams/${data.id}/onboard-members`);
    },
    onError: (err) => {
      if (err.message === "team_url_taken") {
        newTeamFormMethods.setError("slug", { type: "custom", message: t("team_url_taken") });
      } else {
        setServerErrorMessage(err.message);
      }
    },
  });

  return (
    <>
      <Form
        form={newTeamFormMethods}
        handleSubmit={(v) => {
          if (!createTeamMutation.isLoading) {
            setServerErrorMessage(null);
            createTeamMutation.mutate(v);
          }
        }}>
        <div className="mb-8">
          {serverErrorMessage && (
            <div className="mb-4">
              <Alert severity="error" message={serverErrorMessage} />
            </div>
          )}

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
                  placeholder="Acme Inc."
                  name="name"
                  label={t("team_name")}
                  defaultValue={value}
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
            rules={{ required: t("team_url_required") }}
            render={({ field: { value } }) => (
              <TextField
                className="mt-2"
                name="slug"
                placeholder="acme"
                label={t("team_url")}
                addOnLeading={`${process.env.NEXT_PUBLIC_WEBSITE_URL?.replace("https://", "")?.replace(
                  "http://",
                  ""
                )}/team/`}
                defaultValue={value}
                onChange={(e) => {
                  newTeamFormMethods.setValue("slug", slugify(e?.target.value), {
                    shouldTouch: true,
                  });
                  newTeamFormMethods.clearErrors("slug");
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
                <div className="ms-4">
                  <ImageUploader
                    target="avatar"
                    id="avatar-upload"
                    buttonMsg={t("update")}
                    handleAvatarChange={(newAvatar: string) => {
                      newTeamFormMethods.setValue("logo", newAvatar);
                      createTeamMutation.reset();
                    }}
                    imageSrc={value}
                  />
                </div>
              </div>
            )}
          />
        </div>

        <div className="flex space-x-2 rtl:space-x-reverse">
          <Button
            disabled={createTeamMutation.isLoading}
            color="secondary"
            href={returnToParam}
            className="w-full justify-center">
            {t("cancel")}
          </Button>
          <Button
            disabled={newTeamFormMethods.formState.isSubmitting || createTeamMutation.isLoading}
            color="primary"
            EndIcon={ArrowRight}
            type="submit"
            className="w-full justify-center">
            {t("continue")}
          </Button>
        </div>
      </Form>
    </>
  );
};
