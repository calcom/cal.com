"use client";

import type { SessionContextValue } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useOnboardingStore } from "@calcom/features/ee/organizations/lib/onboardingStore";
import { subdomainSuffix } from "@calcom/features/ee/organizations/lib/orgDomains";
import classNames from "@calcom/lib/classNames";
import { MINIMUM_NUMBER_OF_ORG_SEATS } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { useTelemetry } from "@calcom/lib/telemetry";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Alert, Button, Form, Label, RadioGroup as RadioArea, TextField, ToggleGroup } from "@calcom/ui";

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
  if (!session.data) {
    return null;
  }
  return <CreateANewOrganizationFormChild session={session.data} />;
};

enum BillingPeriod {
  MONTHLY = "MONTHLY",
  ANNUALLY = "ANNUALLY",
}

const CreateANewOrganizationFormChild = ({
  session,
}: {
  session: SessionContextValue["data"];
  isPlatformOrg?: boolean;
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const telemetry = useTelemetry();
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const isAdmin = session.user.role === UserPermissionRole.ADMIN;
  const defaultOrgOwnerEmail = session.user.email ?? "";

  const { setBillingPeriod, setPricePerSeat, setSeats, setOrgOwnerEmail, setName, setSlug } =
    useOnboardingStore();

  const newOrganizationFormMethods = useForm<{
    name: string;
    seats: number;
    billingPeriod: BillingPeriod;
    pricePerSeat: number;
    slug: string;
    orgOwnerEmail: string;
  }>({
    defaultValues: {
      billingPeriod: BillingPeriod.MONTHLY,
      slug: !isAdmin ? deriveSlugFromEmail(defaultOrgOwnerEmail) : undefined,
      orgOwnerEmail: !isAdmin ? defaultOrgOwnerEmail : undefined,
      name: !isAdmin ? deriveOrgNameFromEmail(defaultOrgOwnerEmail) : undefined,
    },
  });

  const utils = trpc.useUtils();

  return (
    <>
      <Form
        form={newOrganizationFormMethods}
        className="space-y-5"
        id="createOrg"
        handleSubmit={async (values) => {
          setServerErrorMessage(null);
          const isSlugAvailable = await utils.viewer.organizations.checkAvailableSlug.fetch({
            slug: values.slug,
          });
          if (!isSlugAvailable) {
            newOrganizationFormMethods.setError("slug", {
              message: t("organization_slug_taken"),
            });
            return;
          }

          setBillingPeriod(values.billingPeriod);
          setPricePerSeat(values.pricePerSeat);
          setSeats(values.seats);
          setOrgOwnerEmail(values.orgOwnerEmail);
          setName(values.name);
          setSlug(values.slug);

          // Navigate to next step
          router.push("/settings/organizations/new/about");
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

        {/* This radio group does nothing - its just for visuall purposes */}
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
                  <p>{t("organization_price_per_user_month")}</p>
                </RadioArea.Item>
              </RadioArea.Group>
            </div>
          </>
        )}

        <div className="flex space-x-2 rtl:space-x-reverse">
          <Button
            loading={newOrganizationFormMethods.formState.isSubmitting}
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
