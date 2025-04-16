"use client";

import type { SessionContextValue } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { subdomainSuffix } from "@calcom/features/ee/organizations/lib/orgDomains";
import { MINIMUM_NUMBER_OF_ORG_SEATS } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { CreationSource } from "@calcom/prisma/enums";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { Ensure } from "@calcom/types/utils";
import classNames from "@calcom/ui/classNames";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { ToggleGroup } from "@calcom/ui/components/form";
import { Form } from "@calcom/ui/components/form";
import { Label } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { RadioAreaGroup as RadioArea } from "@calcom/ui/components/radio";

import { useOnboarding } from "../lib/onboardingStore";

function extractDomainFromEmail(email: string) {
  let out = "";
  try {
    const match = email.match(/^(?:.*?:\/\/)?.*?(?<root>[\w\-]*(?:\.\w{2,}|\.\w{2,}\.\w{2}))(?:[\/?#:]|$)/);
    out = (match && match.groups?.root) ?? "";
  } catch (ignore) {}
  return out.split(".")[0];
}

export const CreateANewOrganizationForm = () => {
  const session = useSession();

  const { isLoadingOrgOnboarding } = useOnboarding({ step: "start" });
  if (!session.data || isLoadingOrgOnboarding) {
    return null;
  }

  return <CreateANewOrganizationFormChild session={session} />;
};

enum BillingPeriod {
  MONTHLY = "MONTHLY",
  ANNUALLY = "ANNUALLY",
}

const CreateANewOrganizationFormChild = ({ session }: { session: Ensure<SessionContextValue, "data"> }) => {
  const { t } = useLocale();
  const router = useRouter();
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const isAdmin = session.data.user.role === UserPermissionRole.ADMIN;
  const defaultOrgOwnerEmail = session.data.user.email ?? "";
  const { useOnboardingStore } = useOnboarding({ step: "start" });
  const { slug, name, orgOwnerEmail, billingPeriod, pricePerSeat, seats, onboardingId, reset } =
    useOnboardingStore();

  const newOrganizationFormMethods = useForm<{
    name: string;
    seats: number | null;
    billingPeriod: BillingPeriod;
    pricePerSeat: number | null;
    slug: string;
    orgOwnerEmail: string;
  }>({
    defaultValues: {
      billingPeriod: billingPeriod ?? BillingPeriod.MONTHLY,
      slug: slug ?? (!isAdmin ? deriveSlugFromEmail(defaultOrgOwnerEmail) : undefined),
      orgOwnerEmail: orgOwnerEmail || (!isAdmin ? defaultOrgOwnerEmail : undefined),
      name: name ?? (!isAdmin ? deriveOrgNameFromEmail(defaultOrgOwnerEmail) : undefined),
      seats: seats ?? null,
      pricePerSeat: pricePerSeat ?? null,
    },
  });

  const intentToCreateOrgMutation = trpc.viewer.organizations.intentToCreateOrg.useMutation({
    onSuccess: async (data) => {
      // TODO: To be moved to _invoice.paid.org.ts
      // telemetry.event(telemetryEventTypes.org_created);
      reset({
        onboardingId: data.organizationOnboardingId,
        billingPeriod: data.billingPeriod,
        pricePerSeat: data.pricePerSeat ?? null,
        seats: data.seats ?? null,
        orgOwnerEmail: data.orgOwnerEmail,
        name: data.name,
        slug: data.slug,
      });

      if (isAdmin) {
        router.push("/settings/organizations/new/handover");
      } else {
        router.push("/settings/organizations/new/about");
      }
    },
    onError: (err) => {
      if (err.message === "organization_url_taken") {
        newOrganizationFormMethods.setError("slug", { type: "custom", message: t("url_taken") });
      } else if (err.message === "domain_taken_team" || err.message === "domain_taken_project") {
        newOrganizationFormMethods.setError("slug", {
          type: "custom",
          message: t("problem_registering_domain"),
        });
      } else {
        setServerErrorMessage(t(err.message));
      }
    },
  });

  const needToCreateOnboarding = !onboardingId;
  return (
    <>
      <Form
        form={newOrganizationFormMethods}
        className="space-y-5"
        id="createOrg"
        handleSubmit={async (v) => {
          if (!needToCreateOnboarding) {
            router.push("/settings/organizations/new/about");
          } else if (!intentToCreateOrgMutation.isPending) {
            setServerErrorMessage(null);
            intentToCreateOrgMutation.mutate({ ...v, creationSource: CreationSource.WEBAPP });
          }
        }}>
        <div>
          {serverErrorMessage && (
            <div className="mb-4">
              <Alert severity="error" message={serverErrorMessage} />
            </div>
          )}
          {isAdmin && (
            <div className="mb-5">
              <Controller
                name="billingPeriod"
                control={newOrganizationFormMethods.control}
                render={({ field: { value, onChange } }) => (
                  <>
                    <Label htmlFor="billingPeriod">Billing Period</Label>
                    <ToggleGroup
                      isFullWidth
                      id="billingPeriod"
                      value={value}
                      onValueChange={(e: BillingPeriod) => {
                        if ([BillingPeriod.ANNUALLY, BillingPeriod.MONTHLY].includes(e)) {
                          onChange(e);
                        }
                      }}
                      options={[
                        {
                          value: "MONTHLY",
                          label: "Monthly",
                        },
                        {
                          value: "ANNUALLY",
                          label: "Annually",
                        },
                      ]}
                    />
                  </>
                )}
              />
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
                  label={t("admin_email")}
                  defaultValue={value}
                  onChange={(e) => {
                    const email = e?.target.value;
                    newOrganizationFormMethods.setValue("orgOwnerEmail", email.trim());
                    if (newOrganizationFormMethods.getValues("slug") === "") {
                      const slug = deriveSlugFromEmail(email);
                      newOrganizationFormMethods.setValue("slug", slug);
                    }
                    const name = deriveOrgNameFromEmail(email);
                    newOrganizationFormMethods.setValue("name", name);
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

        {isAdmin && (
          <>
            <section className="grid grid-cols-2 gap-2">
              <div className="w-full">
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
                        min={isAdmin ? 1 : MINIMUM_NUMBER_OF_ORG_SEATS}
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
                        defaultValue={value ?? ""}
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

        {/* This radio group does nothing - its just for visual purposes */}
        {!isAdmin && (
          <>
            <div className="bg-subtle space-y-5  rounded-lg p-5">
              <h3 className="font-cal text-default text-lg font-semibold leading-4">
                Upgrade to Organizations
              </h3>
              <RadioArea.Group className={classNames("mt-1 flex flex-col gap-4")} value="ORGANIZATION">
                <RadioArea.Item
                  className={classNames("bg-default w-full text-sm opacity-70")}
                  value="TEAMS"
                  disabled>
                  <strong className="mb-1 block">{t("teams")}</strong>
                  <p>{t("your_current_plan")}</p>
                </RadioArea.Item>
                <RadioArea.Item className={classNames("bg-default w-full text-sm")} value="ORGANIZATION">
                  <strong className="mb-1 block">{t("organization")}</strong>
                  {pricePerSeat && seats ? (
                    <p>{`$${pricePerSeat} per user per month (${seats} seats minimum) ${
                      billingPeriod === BillingPeriod.ANNUALLY ? "(billed annually)" : ""
                    }`}</p>
                  ) : (
                    <p>{t("organization_price_per_user_month")}</p>
                  )}
                </RadioArea.Item>
              </RadioArea.Group>
            </div>
          </>
        )}

        <div className="flex space-x-2 rtl:space-x-reverse">
          <Button
            loading={newOrganizationFormMethods.formState.isSubmitting || intentToCreateOrgMutation.isPending}
            color="primary"
            EndIcon="arrow-right"
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

export function deriveSlugFromEmail(email: string) {
  const domain = extractDomainFromEmail(email);

  return domain;
}

export function deriveOrgNameFromEmail(email: string) {
  const domain = extractDomainFromEmail(email);

  return domain.charAt(0).toUpperCase() + domain.slice(1);
}
