import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { extractDomainFromWebsiteUrl } from "@calcom/ee/organizations/lib/utils";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import slugify from "@calcom/lib/slugify";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { trpc } from "@calcom/trpc/react";
import { Avatar, Button, Form, ImageUploader, TextField, Alert, Label } from "@calcom/ui";
import { ArrowRight, Plus } from "@calcom/ui/components/icon";

import { useOrgBranding } from "../../organizations/context/provider";
import type { NewTeamFormValues } from "../lib/types";

const querySchema = z.object({
  returnTo: z.string().optional(),
  slug: z.string().optional(),
});

export const CreateANewTeamForm = () => {
  const { t } = useLocale();
  const router = useRouter();
  const telemetry = useTelemetry();
  const params = useParamsWithFallback();
  const parsedQuery = querySchema.safeParse(params);
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const orgBranding = useOrgBranding();

  const returnToParam =
    (parsedQuery.success ? getSafeRedirectUrl(parsedQuery.data.returnTo) : "/settings/teams") ||
    "/settings/teams";

  const newTeamFormMethods = useForm<NewTeamFormValues>({
    defaultValues: {
      slug: parsedQuery.success ? parsedQuery.data.slug : "",
    },
  });

  const createTeamMutation = trpc.viewer.teams.create.useMutation({
    onSuccess: (data) => {
      telemetry.event(telemetryEventTypes.team_created);
      router.push(`/settings/teams/${data.id}/onboard-members`);
    },
    onError: (err) => {
      if (err.message === "team_url_taken") {
        newTeamFormMethods.setError("slug", { type: "custom", message: t("url_taken") });
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
                addOnLeading={`${
                  orgBranding
                    ? orgBranding.fullDomain.replace("https://", "").replace("http://", "") + "/"
                    : `${extractDomainFromWebsiteUrl}/team/`
                }`}
                value={value}
                defaultValue={value}
                onChange={(e) => {
                  newTeamFormMethods.setValue("slug", slugify(e?.target.value, true), {
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
              <>
                <Label>{t("team_logo")}</Label>
                <div className="flex items-center">
                  <Avatar
                    alt=""
                    imageSrc={value}
                    fallback={<Plus className="text-subtle h-6 w-6" />}
                    size="lg"
                  />
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
              </>
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
