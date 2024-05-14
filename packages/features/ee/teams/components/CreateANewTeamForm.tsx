import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Alert, Button, DialogFooter, Form, TextField } from "@calcom/ui";

import { useOrgBranding } from "../../organizations/context/provider";
import { subdomainSuffix } from "../../organizations/lib/orgDomains";
import type { NewTeamFormValues } from "../lib/types";

interface CreateANewTeamFormProps {
  onCancel: () => void;
  submitLabel: string;
  onSuccess: (data: RouterOutputs["viewer"]["teams"]["create"]) => void;
  inDialog?: boolean;
  slug?: string;
}

export const CreateANewTeamForm = (props: CreateANewTeamFormProps) => {
  const { inDialog, onCancel, slug, submitLabel, onSuccess } = props;
  const { t, isLocaleReady } = useLocale();
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const orgBranding = useOrgBranding();

  const newTeamFormMethods = useForm<NewTeamFormValues>({
    defaultValues: {
      slug,
    },
  });

  const createTeamMutation = trpc.viewer.teams.create.useMutation({
    onSuccess: (data) => onSuccess(data),
    onError: (err) => {
      if (err.message === "team_url_taken") {
        newTeamFormMethods.setError("slug", { type: "custom", message: t("url_taken") });
      } else {
        setServerErrorMessage(err.message);
      }
    },
  });

  const FormButtons = () => (
    <>
      <Button
        disabled={createTeamMutation.isPending}
        color="secondary"
        onClick={onCancel}
        className="w-full justify-center">
        {t("cancel")}
      </Button>
      <Button
        disabled={newTeamFormMethods.formState.isSubmitting || createTeamMutation.isPending}
        color="primary"
        EndIcon="arrow-right"
        type="submit"
        className="w-full justify-center"
        data-testid="continue-button">
        {t(submitLabel)}
      </Button>
    </>
  );

  return (
    <>
      <Form
        form={newTeamFormMethods}
        handleSubmit={(v) => {
          if (!createTeamMutation.isPending) {
            setServerErrorMessage(null);
            createTeamMutation.mutate(v);
          }
        }}>
        <div className="mb-8">
          {serverErrorMessage && (
            <div className="mb-4">
              <Alert severity="error" message={t(serverErrorMessage)} />
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
                  disabled={
                    /* E2e is too fast and it tries to fill this way before the form is ready */
                    !isLocaleReady || createTeamMutation.isPending
                  }
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
                  data-testid="team-name"
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
                    ? `${orgBranding.fullDomain.replace("https://", "").replace("http://", "")}/`
                    : `${subdomainSuffix()}/team/`
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

        {inDialog ? (
          <DialogFooter>
            <div className="flex space-x-2 rtl:space-x-reverse">
              <FormButtons />
            </div>
          </DialogFooter>
        ) : (
          <div className="flex space-x-2 rtl:space-x-reverse">
            <FormButtons />
          </div>
        )}
      </Form>
    </>
  );
};
