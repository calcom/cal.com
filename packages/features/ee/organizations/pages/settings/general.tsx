"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { nameOfDay } from "@calcom/lib/weekday";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Form,
  Label,
  Meta,
  Select,
  showToast,
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
  TimezoneSelect,
  SettingsToggle,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@calcom/ui";
import { Lock } from "@calcom/ui/components/icon";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} borderInShellHeader={true} />
      <div className="mb-8 mt-6 space-y-6">
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
  isAdminOrOwner: boolean;
  localeProp: string;
}

const OrgGeneralView = () => {
  const { t } = useLocale();
  const router = useRouter();

  const {
    data: currentOrg,
    isPending,
    error,
  } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {});
  const { data: user } = trpc.viewer.me.useQuery();

  useEffect(
    function refactorMeWithoutEffect() {
      if (error) {
        router.push("/settings");
      }
    },
    [error]
  );

  if (isPending) return <SkeletonLoader title={t("general")} description={t("general_description")} />;
  if (!currentOrg) {
    return null;
  }
  const isAdminOrOwner =
    currentOrg.user.role === MembershipRole.OWNER || currentOrg.user.role === MembershipRole.ADMIN;

  return (
    <LicenseRequired>
      <GeneralView
        currentOrg={currentOrg}
        isAdminOrOwner={isAdminOrOwner}
        localeProp={user?.locale ?? "en"}
      />

      <LimitUsersView
        currentOrg={currentOrg}
        isAdminOrOwner={isAdminOrOwner}
        localeProp={user?.locale ?? "en"}
      />
    </LicenseRequired>
  );
};

const GeneralView = ({ currentOrg, isAdminOrOwner, localeProp }: GeneralViewProps) => {
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
  const isDisabled = isSubmitting || !isDirty || !isAdminOrOwner;
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
      <Meta
        title={t("general")}
        description={t("organization_general_description")}
        borderInShellHeader={true}
      />
      <div className="border-subtle border-x border-y-0 px-4 py-8 sm:px-6">
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

      <SectionBottomActions align="end">
        <Button disabled={isDisabled} color="primary" type="submit">
          {t("update")}
        </Button>
      </SectionBottomActions>
    </Form>
  );
};

type CurrentEventTypeOptions = "DELETE" | "HIDE" | "LEAVE_ON_PROFILE";

const LimitUsersView = ({ currentOrg, isAdminOrOwner }: GeneralViewProps) => {
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

  const currentEventTypeOptions = [
    { value: "DELETE", label: t("delete_event_types_from_profile") },
    { value: "HIDE", label: t("hide_event_types_from_profile") },
    { value: "LEAVE_ON_PROFILE", label: t("leave_event_types_from_profile") },
  ] as { value: CurrentEventTypeOptions; label: string }[];

  const formMethods = useForm<{
    lockEventTypeCreationForUsers: boolean;
    currentEventTypeOptions: CurrentEventTypeOptions;
  }>({
    defaultValues: {
      lockEventTypeCreationForUsers: !!currentOrg.organizationSettings.lockEventTypeCreationForUsers,
      currentEventTypeOptions: "LEAVE_ON_PROFILE",
    },
  });

  const lockEventTypeCreationForUsers = formMethods.watch("lockEventTypeCreationForUsers");

  const {
    formState: { isDirty, isSubmitting, isSubmitSuccessful },
    reset,
    getValues,
  } = formMethods;
  const isDisabled = isSubmitting || !isDirty || !isAdminOrOwner;

  const modalOpen =
    lockEventTypeCreationForUsers &&
    !currentOrg.organizationSettings.lockEventTypeCreationForUsers &&
    !isSubmitSuccessful;

  return (
    <Form
      form={formMethods}
      handleSubmit={(value) => {
        console.log(value);
      }}>
      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("lock_users_eventtypes")}
        disabled={mutation?.isPending}
        description={t("lock_users_eventtypes_description")}
        checked={lockEventTypeCreationForUsers}
        onCheckedChange={(checked) => {
          formMethods.setValue("lockEventTypeCreationForUsers", checked);
        }}
        switchContainerClassName="mt-6"
      />
      {modalOpen && (
        <Dialog
          open={modalOpen}
          onOpenChange={(e) => {
            if (!e) {
              formMethods.setValue(
                "lockEventTypeCreationForUsers",
                !!currentOrg.organizationSettings.lockEventTypeCreationForUsers
              );
            }
          }}>
          <DialogContent enableOverflow>
            <div className="flex flex-row space-x-3">
              <div className="bg-subtle flex h-10 w-10 flex-shrink-0 justify-center rounded-full ">
                <Lock className="m-auto h-6 w-6" />
              </div>
              <div className="w-full pt-1">
                <DialogHeader
                  title={t("lock_event_types_modal_header")}
                  subtitle={t("lock_event_types_modal_description")}
                />
                <Controller
                  name="currentEventTypeOptions"
                  control={formMethods.control}
                  render={({ field: { value } }) => (
                    <>
                      <Label className="text-emphasis mt-6">
                        <>{t("options")}</>
                      </Label>
                      <Select
                        className="mb-2"
                        value={value}
                        // @ts-expect-error react-select types not liking the static strings being used
                        options={currentEventTypeOptions}
                        onChange={(e) => {
                          if (e) formMethods.setValue("currentEventTypeOptions", e);
                        }}
                      />
                    </>
                  )}
                />

                <DialogFooter>
                  <DialogClose />
                  <Button type="submit" disabled={isDisabled}>
                    {t("submit")}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Form>
  );
};

OrgGeneralView.getLayout = getLayout;
export default OrgGeneralView;
