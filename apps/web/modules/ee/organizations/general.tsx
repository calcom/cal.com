"use client";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { nameOfDay } from "@calcom/lib/weekday";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Form, Label, Select } from "@calcom/ui/components/form";
import { SkeletonButton, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { TimezoneSelect } from "@calcom/web/modules/timezone/components/TimezoneSelect";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import LicenseRequired from "~/ee/common/components/LicenseRequired";
import { DisableAutofillOnBookingPageSwitch } from "~/ee/organizations/components/DisableAutofillOnBookingPageSwitch";
import { DisablePhoneOnlySMSNotificationsSwitch } from "~/ee/organizations/components/DisablePhoneOnlySMSNotificationsSwitch";
import { LockEventTypeSwitch } from "~/ee/organizations/components/LockEventTypeSwitch";
import { NoSlotsNotificationSwitch } from "~/ee/organizations/components/NoSlotsNotificationSwitch";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="stack-y-6 mb-8 mt-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />

        <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
      </div>
    </SkeletonContainer>
  );
};

interface GeneralViewProps {
  currentOrg: RouterOutputs["viewer"]["organizations"]["listCurrent"];
  localeProp: string;

  permissions: {
    canRead: boolean;
    canEdit: boolean;
  };
}

const OrgGeneralView = ({
  permissions,
}: {
  permissions: {
    canRead: boolean;
    canEdit: boolean;
  };
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const session = useSession();

  const {
    data: currentOrg,
    isPending,
    error,
  } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {});

  useEffect(
    function refactorMeWithoutEffect() {
      if (error) {
        router.replace("/enterprise");
      }
    },
    [error]
  );

  if (isPending) return <SkeletonLoader />;
  if (!currentOrg) {
    return null;
  }

  return (
    <LicenseRequired>
      <GeneralView
        currentOrg={currentOrg}
        localeProp={session.data?.user.locale ?? "en"}
        permissions={permissions}
      />

      {permissions.canEdit && (
        <>
          <LockEventTypeSwitch currentOrg={currentOrg} />
          <NoSlotsNotificationSwitch currentOrg={currentOrg} />
          <DisablePhoneOnlySMSNotificationsSwitch currentOrg={currentOrg} />
          <DisableAutofillOnBookingPageSwitch currentOrg={currentOrg} />
        </>
      )}
    </LicenseRequired>
  );
};

const GeneralView = ({ currentOrg, permissions, localeProp }: GeneralViewProps) => {
  const { t } = useLocale();

  const mutation = trpc.viewer.organizations.update.useMutation({
    onSuccess: async () => {
      reset(getValues());
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const timeFormatOptions = [
    { value: 12, label: t("12_hour") },
    { value: 24, label: t("24_hour") },
  ];

  const weekStartOptions = [
    { value: "Sunday", label: nameOfDay(localeProp, 0) },
    { value: "Monday", label: nameOfDay(localeProp, 1) },
    { value: "Tuesday", label: nameOfDay(localeProp, 2) },
    { value: "Wednesday", label: nameOfDay(localeProp, 3) },
    { value: "Thursday", label: nameOfDay(localeProp, 4) },
    { value: "Friday", label: nameOfDay(localeProp, 5) },
    { value: "Saturday", label: nameOfDay(localeProp, 6) },
  ];

  const formMethods = useForm({
    defaultValues: {
      timeZone: currentOrg.timeZone || "",
      timeFormat: {
        value: currentOrg.timeFormat || 12,
        label: timeFormatOptions.find((option) => option.value === currentOrg.timeFormat)?.label || 12,
      },
      weekStart: {
        value: currentOrg.weekStart,
        label:
          weekStartOptions.find((option) => option.value === currentOrg.weekStart)?.label ||
          nameOfDay(localeProp, 0),
      },
    },
  });
  const {
    formState: { isDirty, isSubmitting },
    reset,
    getValues,
  } = formMethods;
  const isDisabled = isSubmitting || !isDirty || !permissions.canEdit;
  return (
    <Form
      form={formMethods}
      handleSubmit={(values) => {
        mutation.mutate({
          ...values,
          timeFormat: values.timeFormat.value,
          weekStart: values.weekStart.value,
        });
      }}>
      <div
        className={classNames(
          "border-subtle border-x border-y-0 px-4 py-8 sm:px-6",
          !permissions.canEdit && "rounded-b-lg border-y"
        )}>
        <Controller
          name="timeZone"
          control={formMethods.control}
          render={({ field: { value } }) => (
            <>
              <Label className="text-emphasis">
                <>{t("timezone")}</>
              </Label>
              <TimezoneSelect
                id="timezone"
                value={value}
                onChange={(event) => {
                  if (event) formMethods.setValue("timeZone", event.value, { shouldDirty: true });
                }}
              />
            </>
          )}
        />
        <Controller
          name="timeFormat"
          control={formMethods.control}
          render={({ field: { value } }) => (
            <>
              <Label className="text-emphasis mt-6">
                <>{t("time_format")}</>
              </Label>
              <Select
                value={value}
                options={timeFormatOptions}
                onChange={(event) => {
                  if (event) formMethods.setValue("timeFormat", { ...event }, { shouldDirty: true });
                }}
              />
            </>
          )}
        />
        <div className="text-gray text-default mt-2 flex items-center text-sm">
          {t("timeformat_profile_hint")}
        </div>
        <Controller
          name="weekStart"
          control={formMethods.control}
          render={({ field: { value } }) => (
            <>
              <Label className="text-emphasis mt-6">
                <>{t("start_of_week")}</>
              </Label>
              <Select
                value={value}
                options={weekStartOptions}
                onChange={(event) => {
                  if (event) formMethods.setValue("weekStart", { ...event }, { shouldDirty: true });
                }}
              />
            </>
          )}
        />
      </div>

      {permissions?.canEdit && (
        <SectionBottomActions align="end">
          <Button disabled={isDisabled} color="primary" type="submit">
            {t("update")}
          </Button>
        </SectionBottomActions>
      )}
    </Form>
  );
};

export default OrgGeneralView;
