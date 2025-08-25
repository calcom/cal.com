"use client";

import { Button } from "@calid/features/ui/components/button";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { useTelemetry } from "@calcom/lib/hooks/useTelemetry";
import slugify from "@calcom/lib/slugify";
import { telemetryEventTypes } from "@calcom/lib/telemetry";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc/react";
import { Form, TextField } from "@calcom/ui/components/form";

const querySchema = z.object({
  returnTo: z.string().optional(),
  slug: z.string().optional(),
});

type NewTeamFormValues = {
  name: string;
  slug: string;
};

const CreateNewTeamPage = () => {
  const params = useParamsWithFallback();
  const parsedQuery = querySchema.safeParse(params);
  const router = useRouter();
  const telemetry = useTelemetry();
  const { t } = useLocale();

  const flag = {
    telemetryEvent: telemetryEventTypes.team_created,
  };

  const returnToParam =
    (parsedQuery.success ? getSafeRedirectUrl(parsedQuery.data.returnTo) : "/teams") || "/teams";

  const onSuccess = (data: RouterOutputs["viewer"]["teams"]["create"]) => {
    telemetry.event(flag.telemetryEvent);
    router.push(data.url);
  };

  const formMethods = useForm<NewTeamFormValues>({
    defaultValues: {
      name: "",
      slug: parsedQuery.success ? parsedQuery.data.slug || "" : "",
    },
  });

  const createTeam = trpc.viewer.teams.create.useMutation({
    onSuccess,
    onError: (err) => {
      if (err.message === "team_url_taken") {
        formMethods.setError("slug", { type: "custom", message: "URL is taken" });
      }
    },
  });

  return (
    <>
      <Form
        form={formMethods}
        handleSubmit={(values) => {
          if (!createTeam.isPending) {
            createTeam.mutate(values);
          }
        }}>
        <div className="mb-8">
          <Controller
            name="name"
            control={formMethods.control}
            rules={{ required: "Team name is required" }}
            render={({ field: { value } }) => (
              <TextField
                className="mt-2"
                placeholder="OneHash Tech Ltd."
                name="name"
                label="Team name"
                defaultValue={value}
                onChange={(e) => {
                  const next = e?.target.value;
                  formMethods.setValue("name", next);
                  if (formMethods.formState.touchedFields["slug"] === undefined) {
                    formMethods.setValue("slug", slugify(next));
                  }
                }}
                autoComplete="off"
                data-testid="team-name"
              />
            )}
          />
        </div>

        <div className="mb-8">
          <Controller
            name="slug"
            control={formMethods.control}
            rules={{ required: "Team URL is required" }}
            render={({ field: { value } }) => (
              <TextField
                name="slug"
                placeholder="onehash"
                label="Team URL"
                value={value}
                defaultValue={value}
                onChange={(e) => {
                  formMethods.setValue("slug", slugify(e?.target.value, true), {
                    shouldTouch: true,
                  });
                  formMethods.clearErrors("slug");
                }}
                data-testid="team-slug"
              />
            )}
          />
        </div>

        <div className="flex space-x-2 rtl:space-x-reverse">
          <Button
            color="secondary"
            className="w-full justify-center"
            onClick={() => router.push(returnToParam)}
            disabled={createTeam.isPending}>
            {t("cancel")}
          </Button>
          <Button
            color="primary"
            EndIcon="arrow-right"
            type="submit"
            className="w-full justify-center"
            data-testid="continue-button"
            disabled={formMethods.formState.isSubmitting || createTeam.isPending}>
            {t("continue")}
          </Button>
        </div>
      </Form>
    </>
  );
};

export default CreateNewTeamPage;
