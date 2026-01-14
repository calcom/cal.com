"use client";

import { Button } from "@calid/features/ui/components/button";
import { Form, FormField } from "@calid/features/ui/components/form";
import { TextField } from "@calid/features/ui/components/input/input";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { useTelemetry } from "@calcom/lib/hooks/useTelemetry";
import slugify from "@calcom/lib/slugify";
import { telemetryEventTypes } from "@calcom/lib/telemetry";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc/react";

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

  const formMethods = useForm<NewTeamFormValues>({
    defaultValues: {
      name: "",
      slug: parsedQuery.success ? parsedQuery.data.slug || "" : "",
    },
  });

  const createTeam = trpc.viewer.calidTeams.create.useMutation({
    onSuccess: (data: RouterOutputs["viewer"]["calidTeams"]["create"]) => {
      telemetry.event(flag.telemetryEvent);
      router.push(data.onboard_members_url);
    },
    onError: (err) => {
      triggerToast(err.message, "error");
    },
  });

  return (
    <>
      <Form
        form={formMethods}
        {...formMethods}
        onSubmit={(values) => {
          if (!createTeam.isPending) {
            createTeam.mutate(values);
          }
        }}>
        <div className="mb-8">
          <FormField
            name="name"
            control={formMethods.control}
            rules={{ required: t("team_name_is_required") }}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <>
                <TextField
                  name="name"
                  placeholder="OneHash Tech Ltd."
                  label="Team name"
                  value={value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const next = e?.target.value;
                    onChange(next);
                    if (formMethods.formState.touchedFields["slug"] === undefined) {
                      formMethods.setValue("slug", slugify(next));
                    }
                  }}
                  autoComplete="off"
                  data-testid="team-name"
                  required
                  showAsteriskIndicator
                  error={error?.message}
                />
              </>
            )}
          />
        </div>

        <div className="mb-8">
          <FormField
            name="slug"
            control={formMethods.control}
            rules={{ required: t("team_url_is_required") }}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <>
                <TextField
                  name="slug"
                  placeholder="onehash"
                  label="Team URL"
                  value={value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    onChange(slugify(e?.target.value, true));
                  }}
                  data-testid="team-slug"
                  required
                  showAsteriskIndicator
                  error={error?.message}
                />
              </>
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
