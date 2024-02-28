import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import type { SessionContextValue } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { subdomainSuffix } from "@calcom/features/ee/organizations/lib/orgDomains";
import { MINIMUM_NUMBER_OF_ORG_SEATS } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { Ensure } from "@calcom/types/utils";
import { Button, Form, TextField, Alert } from "@calcom/ui";
import { ArrowRight } from "@calcom/ui/components/icon";

function extractDomainFromEmail(email: string) {
  let out = "";
  try {
    const match = email.match(/^(?:.*?:\/\/)?.*?(?<root>[\w\-]*(?:\.\w{2,}|\.\w{2,}\.\w{2}))(?:[\/?#:]|$)/);
    out = (match && match.groups?.root) ?? "";
  } catch (ignore) {}
  return out.split(".")[0];
}

export const CreateANewOrganizationForm = ({ slug }: { slug?: string }) => {
  const session = useSession();
  if (!session.data) {
    return null;
  }
  return <CreateANewOrganizationFormChild slug={slug} session={session} />;
};

const CreateANewOrganizationFormChild = ({
  slug,
  session,
}: {
  slug?: string;
  session: Ensure<SessionContextValue, "data">;
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const telemetry = useTelemetry();
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const isAdmin = session.data.user.role === UserPermissionRole.ADMIN;
  const isImpersonated = session.data.user.impersonatedBy;
  const defaultAdminEmail = session.data.user.email ?? "";
  const newOrganizationFormMethods = useForm<{
    name: string;
    seats: number;
    pricePerSeat: number;
    slug: string;
    adminEmail: string;
    adminUsername: string;
  }>({
    defaultValues: {
      slug: deriveSlugFromEmail(defaultAdminEmail),
      adminEmail: defaultAdminEmail,
      name: deriveOrgNameFromEmail(defaultAdminEmail),
    },
  });

  const createOrganizationMutation = trpc.viewer.organizations.create.useMutation({
    onSuccess: async (data) => {
      telemetry.event(telemetryEventTypes.org_created);
      // This is necessary so that server token has the updated upId
      await session.update({
        upId: data.upId,
      });
      if (isAdmin && data.userId !== session.data?.user.id) {
        signIn("impersonation-auth", {
          username: data.email,
          callbackUrl: `/settings/organizations/${data.organizationId}/about`,
        });
      }
      router.push(`/settings/organizations/${data.organizationId}/about`);
    },
    onError: (err) => {
      if (err.message === "admin_email_taken") {
        newOrganizationFormMethods.setError("adminEmail", {
          type: "custom",
          message: t("email_already_used"),
        });
      } else if (err.message === "organization_url_taken") {
        newOrganizationFormMethods.setError("slug", { type: "custom", message: t("url_taken") });
      } else if (err.message === "domain_taken_team" || err.message === "domain_taken_project") {
        newOrganizationFormMethods.setError("slug", {
          type: "custom",
          message: t("problem_registering_domain"),
        });
      } else {
        setServerErrorMessage(err.message);
      }
    },
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
            createOrganizationMutation.mutate(v);
          }
        }}>
        <div>
          {serverErrorMessage && (
            <div className="mb-4">
              <Alert severity="error" message={serverErrorMessage} />
            </div>
          )}
          <Controller
            name="adminEmail"
            control={newOrganizationFormMethods.control}
            rules={{
              required: t("must_enter_organization_admin_email"),
            }}
            render={({ field: { value } }) => (
              <div className="flex">
                <TextField
                  containerClassName="w-full"
                  placeholder="john@acme.com"
                  name="adminEmail"
                  disabled={!isAdmin && !isImpersonated}
                  label={t("admin_email")}
                  defaultValue={value}
                  onChange={(e) => {
                    const email = e?.target.value;
                    const slug = deriveSlugFromEmail(email);
                    newOrganizationFormMethods.setValue("adminEmail", email.trim());
                    newOrganizationFormMethods.setValue("adminUsername", email.split("@")[0].trim());
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
                  label={t("organization_name")}
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

        <div>
          <Controller
            name="slug"
            control={newOrganizationFormMethods.control}
            rules={{
              required: "Must enter organization slug",
            }}
            render={({ field: { value } }) => (
              <TextField
                className="mt-2"
                name="slug"
                label={t("organization_url")}
                placeholder="acme"
                addOnSuffix={`.${subdomainSuffix()}`}
                defaultValue={value}
                onChange={(e) => {
                  newOrganizationFormMethods.setValue("slug", slugify(e?.target.value), {
                    shouldTouch: true,
                  });
                  newOrganizationFormMethods.clearErrors("slug");
                }}
              />
            )}
          />
        </div>

        {(isAdmin || isImpersonated) && (
          <>
            <section className="grid grid-cols-2 gap-2">
              <div className="w-full">
                {serverErrorMessage && (
                  <div className="mb-4">
                    <Alert severity="error" message={serverErrorMessage} />
                  </div>
                )}
                <Controller
                  name="seats"
                  control={newOrganizationFormMethods.control}
                  render={({ field: { value, onChange } }) => (
                    <div className="flex">
                      <TextField
                        containerClassName="w-full"
                        placeholder="30"
                        name="seats"
                        type="number"
                        label="Seats (optional)"
                        min={MINIMUM_NUMBER_OF_ORG_SEATS}
                        defaultValue={value || MINIMUM_NUMBER_OF_ORG_SEATS}
                        onChange={(e) => {
                          onChange(+e.target.value);
                        }}
                        autoComplete="off"
                      />
                    </div>
                  )}
                />
              </div>
              <div className="w-full">
                {serverErrorMessage && (
                  <div className="mb-4">
                    <Alert severity="error" message={serverErrorMessage} />
                  </div>
                )}
                <Controller
                  name="pricePerSeat"
                  control={newOrganizationFormMethods.control}
                  render={({ field: { value, onChange } }) => (
                    <div className="flex">
                      <TextField
                        containerClassName="w-full"
                        placeholder="30"
                        name="pricePerSeat"
                        type="number"
                        addOnSuffix="$"
                        label="Price per seat (optional)"
                        defaultValue={value}
                        onChange={(e) => {
                          onChange(+e.target.value);
                        }}
                        autoComplete="off"
                      />
                    </div>
                  )}
                />
              </div>
            </section>
          </>
        )}

        <input hidden {...newOrganizationFormMethods.register("adminUsername")} />

        <div className="flex space-x-2 rtl:space-x-reverse">
          <Button
            disabled={
              newOrganizationFormMethods.formState.isSubmitting || createOrganizationMutation.isPending
            }
            color="primary"
            EndIcon={ArrowRight}
            type="submit"
            form="createOrg"
            className="w-full justify-center">
            {t("continue")}
          </Button>
        </div>
      </Form>
    </>
  );
};

function deriveSlugFromEmail(email: string) {
  const domain = extractDomainFromEmail(email);

  return domain;
}

function deriveOrgNameFromEmail(email: string) {
  const domain = extractDomainFromEmail(email);

  return domain.charAt(0).toUpperCase() + domain.slice(1);
}
