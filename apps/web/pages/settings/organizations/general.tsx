import { useRouter } from "next/router";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { nameOfDay } from "@calcom/lib/weekday";
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

import PageWrapper from "@components/PageWrapper";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} />
      <div className="mt-6 mb-8 space-y-6">
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
  localeProp: string;
  currentOrg: RouterOutputs["viewer"]["organizations"]["listCurrent"];
}

const GeneralQueryView = () => {
  const { t } = useLocale();
  const router = useRouter();

  const { data: user } = trpc.viewer.me.useQuery();
  const { data: currentOrg, isLoading } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {
    onError: () => {
      router.push("/settings");
    },
  });
  if (isLoading) return <SkeletonLoader title={t("general")} description={t("general_description")} />;
  if (!currentOrg) {
    throw new Error(t("something_went_wrong"));
  }
  return <GeneralView currentOrg={currentOrg} localeProp={currentOrg?.locale ?? "en"} />;
};

const GeneralView = ({ localeProp, currentOrg }: GeneralViewProps) => {
  const router = useRouter();
  const { t } = useLocale();

  const mutation = trpc.viewer.organizations.update.useMutation({
    onSuccess: async () => {
      //TODO: Invalidate our previous i18n cache
      reset(getValues());
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
    onSettled: async () => {
      //TODO: Invalidate our previous i18n cach
    },
  });

  const localeOptions = useMemo(() => {
    return (router.locales || []).map((locale) => ({
      value: locale,
      label: new Intl.DisplayNames(locale, { type: "language" }).of(locale) || "",
    }));
  }, [router.locales]);

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
      locale: {
        value: localeProp || "",
        label: localeOptions.find((option) => option.value === localeProp)?.label || "",
      },
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
  const isDisabled = isSubmitting || !isDirty;
  return (
    <Form
      form={formMethods}
      handleSubmit={(values) => {
        mutation.mutate({
          ...values,
          locale: values.locale.value,
          timeFormat: values.timeFormat.value,
          weekStart: values.weekStart.value,
        });
      }}>
      <Meta title={t("general")} description={t("organization_general_description")} />
      <Controller
        name="locale"
        render={({ field: { value, onChange } }) => (
          <>
            <Label className="text-emphasis">
              <>{t("language")}</>
            </Label>
            <Select<{ label: string; value: string }>
              className="capitalize"
              options={localeOptions}
              value={value}
              onChange={onChange}
            />
          </>
        )}
      />
      <Controller
        name="timeZone"
        control={formMethods.control}
        render={({ field: { value } }) => (
          <>
            <Label className="text-emphasis mt-8">
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
            <Label className="text-emphasis mt-8">
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
            <Label className="text-emphasis mt-8">
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
      <Button disabled={isDisabled} color="primary" type="submit" className="mt-8">
        <>{t("update")}</>
      </Button>
    </Form>
  );
};

GeneralQueryView.getLayout = getLayout;
GeneralQueryView.PageWrapper = PageWrapper;

export default GeneralQueryView;
