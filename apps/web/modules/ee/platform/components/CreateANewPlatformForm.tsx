"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { CreationSource, UserPermissionRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { Ensure } from "@calcom/types/utils";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField } from "@calcom/ui/components/form";
import { useRouter } from "next/navigation";
import type { SessionContextValue } from "next-auth/react";
import { signIn, useSession } from "next-auth/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { uuid } from "short-uuid";
import {
  deriveOrgNameFromEmail,
  deriveSlugFromEmail,
} from "~/ee/organizations/components/CreateANewOrganizationForm";

export const CreateANewPlatformForm = () => {
  const session = useSession();
  if (!session.data) {
    return null;
  }
  return <CreateANewPlatformFormChild session={session} />;
};

const CreateANewPlatformFormChild = ({ session }: { session: Ensure<SessionContextValue, "data"> }) => {
  const { t } = useLocale();
  const router = useRouter();
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const isAdmin = session.data.user.role === UserPermissionRole.ADMIN;
  const defaultOrgOwnerEmail = session.data.user.email ?? "";
  const newOrganizationFormMethods = useForm<{
    name: string;
    slug: string;
    orgOwnerEmail: string;
    isPlatform: boolean;
  }>({
    defaultValues: {
      slug: !isAdmin ? deriveSlugFromEmail(defaultOrgOwnerEmail) : undefined,
      orgOwnerEmail: !isAdmin ? defaultOrgOwnerEmail : undefined,
      name: !isAdmin ? deriveOrgNameFromEmail(defaultOrgOwnerEmail) : undefined,
      isPlatform: true,
    },
  });

  const createOrganizationMutation = trpc.viewer.organizations.create.useMutation({
    onSuccess: async (data) => {
      // telemetry.event(telemetryEventTypes.org_created);
      // This is necessary so that server token has the updated upId
      await session.update({
        upId: data.upId,
      });
      if (isAdmin && data.userId !== session.data?.user.id) {
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
        newOrganizationFormMethods.setError("slug", { type: "custom", message: t("url_taken") });
        setServerErrorMessage(err.message);
      } else if (err.message === "domain_taken_team" || err.message === "domain_taken_project") {
        newOrganizationFormMethods.setError("slug", {
          type: "custom",
          message: t("problem_registering_domain"),
        });
        setServerErrorMessage(err.message);
      } else {
        setServerErrorMessage(err.message);
      }
    },
  });

  return (
    <>
      <Form
        form={newOrganizationFormMethods}
        className="stack-y-5"
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
