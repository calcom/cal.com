"use client";

import type { Session } from "next-auth";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UseFormSetError } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { uuid } from "short-uuid";

import { deriveOrgNameFromEmail } from "@calcom/ee/organizations/components/CreateANewOrganizationForm";
import { deriveSlugFromEmail } from "@calcom/ee/organizations/components/CreateANewOrganizationForm";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTelemetry } from "@calcom/lib/hooks/useTelemetry";
import slugify from "@calcom/lib/slugify";
import { telemetryEventTypes } from "@calcom/lib/telemetry";
import { CreationSource } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { Form } from "@calcom/ui/components/form";

type FormValues = {
  name: string;
  slug: string;
  orgOwnerEmail: string;
  isPlatform: boolean;
};

export const CreateANewPlatformForm = () => {
  const { data: session, status } = useSession();
  if (status !== "authenticated") {
    return null;
  }
  return <CreateANewPlatformFormChild user={session.user} />;
};

const useCreateOrganizationMutation = ({
  user,
  setServerErrorMessage,
  setFormError,
}: {
  setServerErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
  setFormError: UseFormSetError<FormValues>;
  user: Session["user"];
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const telemetry = useTelemetry();
  const { update } = useSession();

  const createOrganizationMutation = trpc.viewer.organizations.create.useMutation({
    onSuccess: async (data) => {
      telemetry.event(telemetryEventTypes.org_created);
      // This is necessary so that server token has the updated upId
      await update({
        upId: data.upId,
      });
      if (user.role === "ADMIN" && data.userId !== user.id) {
        // Impersonate the user chosen as the organization owner(if the admin user isn't the owner himself), so that admin can now configure the organisation on his behalf.
        // He won't need to have access to the org directly in this way.
        signIn("impersonation-auth", {
          username: data.email,
          callbackUrl: `/settings/platform`,
        });
      }
      router.push("/settings/platform");
    },
    onError: (err) => {
      if (err.message === "organization_url_taken") {
        setFormError("slug", { type: "custom", message: t("url_taken") });
        setServerErrorMessage(err.message);
      } else if (err.message === "domain_taken_team" || err.message === "domain_taken_project") {
        setFormError("slug", {
          type: "custom",
          message: t("problem_registering_domain"),
        });
        setServerErrorMessage(err.message);
      } else {
        setServerErrorMessage(err.message);
      }
    },
  });

  return {
    createOrganizationMutation,
  };
};

const CreateANewPlatformFormChild = ({ user }: { user: Session["user"] }) => {
  const { t } = useLocale();
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const isAdmin = user.role === "ADMIN";
  const defaultOrgOwnerEmail = user.email ?? "";

  const newOrganizationFormMethods = useForm<FormValues>({
    defaultValues: {
      slug: !isAdmin ? deriveSlugFromEmail(defaultOrgOwnerEmail) : undefined,
      orgOwnerEmail: !isAdmin ? defaultOrgOwnerEmail : undefined,
      name: !isAdmin ? deriveOrgNameFromEmail(defaultOrgOwnerEmail) : undefined,
      isPlatform: true,
    },
  });

  const { createOrganizationMutation } = useCreateOrganizationMutation({
    setServerErrorMessage,
    setFormError: newOrganizationFormMethods.setError,
    user,
  });

  return (
    <>
      <Form
        form={newOrganizationFormMethods}
        className="space-y-5"
        id="createOrg"
        handleSubmit={(v) => {
          if (!createOrganizationMutation.isPending) {
            setServerErrorMessage(null);
            createOrganizationMutation.mutate({
              ...v,
              slug: `${v.name.toLocaleLowerCase()}-platform-${uuid().substring(0, 20)}`,
              creationSource: CreationSource.API_V2,
            });
          }
        }}>
        <div>
          {serverErrorMessage && (
            <div className="mb-4">
              <Alert severity="error" message={serverErrorMessage} />
            </div>
          )}
          <Controller
            name="orgOwnerEmail"
            control={newOrganizationFormMethods.control}
            rules={{
              required: t("must_enter_organization_admin_email"),
            }}
            render={({ field: { value } }) => (
              <div className="flex">
                <TextField
                  containerClassName="w-full"
                  placeholder="john@acme.com"
                  name="orgOwnerEmail"
                  disabled={!isAdmin}
                  label={t("platform_admin_email")}
                  defaultValue={value}
                  onChange={(e) => {
                    const email = e?.target.value;
                    const slug = deriveSlugFromEmail(email);
                    newOrganizationFormMethods.setValue("orgOwnerEmail", email.trim());
                    if (newOrganizationFormMethods.getValues("slug") === "") {
                      newOrganizationFormMethods.setValue("slug", slug);
                    }
                    newOrganizationFormMethods.setValue("name", deriveOrgNameFromEmail(email));
                  }}
                  autoComplete="off"
                />
              </div>
            )}
          />
        </div>

        <div>
          <Controller
            name="name"
            control={newOrganizationFormMethods.control}
            defaultValue=""
            rules={{
              required: t("must_enter_organization_name"),
            }}
            render={({ field: { value } }) => (
              <>
                <TextField
                  className="mt-2"
                  placeholder="Acme"
                  name="name"
                  label={t("platform_name")}
                  defaultValue={value}
                  onChange={(e) => {
                    newOrganizationFormMethods.setValue("name", e?.target.value.trim());
                    if (newOrganizationFormMethods.formState.touchedFields["slug"] === undefined) {
                      newOrganizationFormMethods.setValue("slug", slugify(e?.target.value));
                    }
                  }}
                  autoComplete="off"
                />
              </>
            )}
          />
        </div>

        <div className="flex space-x-2 rtl:space-x-reverse">
          <Button
            disabled={
              newOrganizationFormMethods.formState.isSubmitting || createOrganizationMutation.isPending
            }
            color="primary"
            EndIcon="arrow-right"
            type="submit"
            form="createOrg"
            className="w-full justify-center">
            {t("continue")}
          </Button>
        </div>
        <div />
      </Form>
    </>
  );
};
