import type { SessionContextValue } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { Ensure } from "@calcom/types/utils";
import { Alert, Button, Form, Label, TextField, ToggleGroup } from "@calcom/ui";

import { UserPermissionRole } from "../../../../prisma/enums";

export const CreateANewLicenseKeyForm = () => {
  const session = useSession();
  if (!session.data) {
    return null;
  }
  return <CreateANewLicenseKeyFormChild session={session} />;
};

enum BillingType {
  PER_BOOKING = "PER_BOOKING",
  PER_USER = "PER_USER",
}

enum BillingPeriod {
  MONTHLY = "MONTHLY",
  ANNUALLY = "ANNUALLY",
}

const CreateANewLicenseKeyFormChild = ({ session }: { session: Ensure<SessionContextValue, "data"> }) => {
  const { t } = useLocale();
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const isAdmin = session.data.user.role === UserPermissionRole.ADMIN;
  const newLicenseKeyFormMethods = useForm<{
    billingType: BillingType;
    bookingsIncluded: number;
    usersIncluded: number;
    billingPeriod: BillingPeriod;
    overages: number;
    billingEmail: string;
    fixedBaseFee: number;
  }>({
    defaultValues: {
      billingType: BillingType.PER_BOOKING,
      billingPeriod: BillingPeriod.MONTHLY,
      bookingsIncluded: 500,
      usersIncluded: 100,
      overages: 99, // $0.99
      fixedBaseFee: 50, // $99
      billingEmail: undefined,
    },
  });

  const watchedBillingType = newLicenseKeyFormMethods.watch("billingType");
  const watchedBillingPeriod = newLicenseKeyFormMethods.watch("billingPeriod");
  const watchedBookingIncluded = newLicenseKeyFormMethods.watch("bookingsIncluded");
  const watchedUsersIncluded = newLicenseKeyFormMethods.watch("usersIncluded");
  const watchedFixedBaseFee = newLicenseKeyFormMethods.watch("fixedBaseFee");
  function calculateMonthlyPrice() {
    const values = newLicenseKeyFormMethods.getValues();
    const occurance = watchedBillingPeriod === "MONTHLY" ? 1 : 12;

    if (watchedBillingType === BillingType.PER_BOOKING) {
      const sum = watchedBookingIncluded * watchedFixedBaseFee * occurance;
      return `$ ${sum / 100} / ${occurance} months`;
    }
    const sum = watchedUsersIncluded * watchedFixedBaseFee * occurance;
    return `$ ${sum / 100} / ${occurance} months`;
  }

  // const createOrganizationMutation = trpc.viewer.organizations.create.useMutation({
  //   onSuccess: async (data) => {
  //     telemetry.event(telemetryEventTypes.license_key_created);
  //     // This is necessary so that server token has the updated upId
  //     await session.update({
  //       upId: data.upId,
  //     });
  //     if (isAdmin && data.userId !== session.data?.user.id) {
  //       // Impersonate the user chosen as the organization owner(if the admin user isn't the owner himself), so that admin can now configure the organisation on his behalf.
  //       // He won't need to have access to the org directly in this way.
  //       signIn("impersonation-auth", {
  //         username: data.email,
  //         callbackUrl: `/settings/organizations/${data.organizationId}/about`,
  //       });
  //     }
  //     router.push(`/settings/organizations/${data.organizationId}/about`);
  //   },
  //   onError: (err) => {
  //     if (err.message === "organization_url_taken") {
  //       newOrganizationFormMethods.setError("slug", { type: "custom", message: t("url_taken") });
  //     } else if (err.message === "domain_taken_team" || err.message === "domain_taken_project") {
  //       newOrganizationFormMethods.setError("slug", {
  //         type: "custom",
  //         message: t("problem_registering_domain"),
  //       });
  //     } else {
  //       setServerErrorMessage(err.message);
  //     }
  //   },
  // });

  return (
    <>
      <Form
        form={newLicenseKeyFormMethods}
        className="space-y-5"
        id="createOrg"
        handleSubmit={(values) => {
          console.log(values);
        }}>
        <div>
          {serverErrorMessage && (
            <div className="mb-5">
              <Alert severity="error" message={serverErrorMessage} />
            </div>
          )}

          <div className="mb-5">
            <Controller
              name="billingPeriod"
              control={newLicenseKeyFormMethods.control}
              render={({ field: { value, onChange } }) => (
                <>
                  <Label htmlFor="billingPeriod">Billing Period</Label>
                  <ToggleGroup
                    isFullWidth
                    id="billingPeriod"
                    defaultValue={value}
                    onValueChange={(e) => onChange(e)}
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

          <Controller
            name="billingEmail"
            control={newLicenseKeyFormMethods.control}
            rules={{
              required: t("must_enter_billing_email"),
            }}
            render={({ field: { value, onChange } }) => (
              <div className="flex">
                <TextField
                  containerClassName="w-full"
                  placeholder="john@acme.com"
                  name="billingEmail"
                  disabled={!isAdmin}
                  label="Billing Email for Customer"
                  defaultValue={value}
                  onChange={onChange}
                  autoComplete="off"
                />
              </div>
            )}
          />
        </div>
        <div>
          <Controller
            name="billingType"
            control={newLicenseKeyFormMethods.control}
            render={({ field: { value, onChange } }) => (
              <>
                <Label htmlFor="bookingType">Booking Type</Label>
                <ToggleGroup
                  isFullWidth
                  id="bookingType"
                  defaultValue={value}
                  onValueChange={(e) => onChange(e)}
                  options={[
                    {
                      value: "PER_BOOKING",
                      label: "Per Booking",
                      tooltip: "Configure pricing on a per booking basis",
                    },
                    {
                      value: "PER_USER",
                      label: "Per User",
                      tooltip: "Configure pricing on a per user basis",
                    },
                  ]}
                />
              </>
            )}
          />
        </div>

        {watchedBillingType === "PER_BOOKING" && (
          <div className="flex flex-wrap gap-2 [&>*]:flex-1">
            <Controller
              name="bookingsIncluded"
              control={newLicenseKeyFormMethods.control}
              rules={{
                required: "Must enter a total of bookings",
              }}
              render={({ field: { value, onChange } }) => (
                <TextField
                  className="mt-2"
                  name="bookingsIncluded"
                  label="Total bookings included"
                  placeholder="acme"
                  defaultValue={value}
                  onChange={(event) => onChange(+event.target.value)}
                />
              )}
            />
            <Controller
              name="fixedBaseFee"
              control={newLicenseKeyFormMethods.control}
              rules={{
                required: "Must enter fixed base fee",
              }}
              render={({ field: { value, onChange } }) => (
                <TextField
                  className="mt-2"
                  name="fixedBaseFee"
                  label="Fixed Base Fee"
                  placeholder="acme"
                  addOnSuffix="$"
                  defaultValue={value / 100}
                  onChange={(event) => onChange(+event.target.value * 100)}
                />
              )}
            />
          </div>
        )}
        {watchedBillingType === "PER_USER" && (
          <div className="flex flex-wrap gap-2 [&>*]:flex-1">
            <Controller
              name="usersIncluded"
              control={newLicenseKeyFormMethods.control}
              rules={{
                required: "Must enter a total of billable users",
              }}
              render={({ field: { value, onChange } }) => (
                <TextField
                  className="mt-2"
                  name="bookingsIncluded"
                  label="Total users included"
                  placeholder="100"
                  defaultValue={value}
                  onChange={(event) => onChange(+event.target.value)}
                />
              )}
            />
            <Controller
              name="fixedBaseFee"
              control={newLicenseKeyFormMethods.control}
              rules={{
                required: "Must enter fixed price per user",
              }}
              render={({ field: { value, onChange } }) => (
                <TextField
                  className="mt-2"
                  name="fixedBaseFee"
                  label="Fixed price per user"
                  placeholder="acme"
                  addOnSuffix="$"
                  defaultValue={value / 100}
                  onChange={(event) => onChange(+event.target.value * 100)}
                />
              )}
            />
          </div>
        )}

        <div>
          <Controller
            name="overages"
            control={newLicenseKeyFormMethods.control}
            rules={{
              required: "Must enter overages",
            }}
            render={({ field: { value, onChange } }) => (
              <>
                <TextField
                  className="mt-2"
                  placeholder="Acme"
                  name="overages"
                  addOnSuffix="$"
                  label="Overages"
                  disabled={!isAdmin}
                  defaultValue={value / 100}
                  onChange={(event) => onChange(+event.target.value * 100)}
                  autoComplete="off"
                />
              </>
            )}
          />
        </div>

        <div className="flex space-x-2 rtl:space-x-reverse">
          <Button
            disabled={newLicenseKeyFormMethods.formState.isSubmitting}
            color="primary"
            type="submit"
            form="createOrg"
            className="w-full justify-center">
            {t("continue")} - {calculateMonthlyPrice()}
          </Button>
        </div>
      </Form>
    </>
  );
};
