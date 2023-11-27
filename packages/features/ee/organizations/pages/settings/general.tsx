import { useRouter } from "next/navigation";
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
} from "@calcom/ui";

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

  const { data: currentOrg, isLoading } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {
    onError: () => {
      router.push("/settings");
    },
  });
  const { data: user } = trpc.viewer.me.useQuery();

  if (isLoading) return <SkeletonLoader title={t("general")} description={t("general_description")} />;
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

OrgGeneralView.getLayout = getLayout;
export default OrgGeneralView;
