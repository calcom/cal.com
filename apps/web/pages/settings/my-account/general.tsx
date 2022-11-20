import { useRouter } from "next/router";
import { useMemo } from "react";
import { useForm, Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RouterOutputs, trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Form, Label } from "@calcom/ui/components/form";
import Meta from "@calcom/ui/v2/core/Meta";
import TimezoneSelect from "@calcom/ui/v2/core/TimezoneSelect";
import Select from "@calcom/ui/v2/core/form/select";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";
import showToast from "@calcom/ui/v2/core/notifications";
import { SkeletonContainer, SkeletonText, SkeletonButton } from "@calcom/ui/v2/core/skeleton";

import { withQuery } from "@lib/QueryCell";
import { nameOfDay } from "@lib/core/i18n/weekday";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="mt-6 mb-8 space-y-6 divide-y">
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
  user: RouterOutputs["viewer"]["me"];
}

const WithQuery = withQuery(trpc.viewer.public.i18n, undefined, { trpc: { context: { skipBatch: true } } });

const GeneralQueryView = () => {
  const { t } = useLocale();

  const { data: user, isLoading } = trpc.viewer.me.useQuery();
  if (isLoading) return <SkeletonLoader />;
  if (!user) {
    throw new Error(t("something_went_wrong"));
  }
  return (
    <WithQuery
      success={({ data }) => <GeneralView user={user} localeProp={data.locale} />}
      customLoader={<SkeletonLoader />}
    />
  );
};

const GeneralView = ({ localeProp, user }: GeneralViewProps) => {
  const router = useRouter();
  const utils = trpc.useContext();
  const { t } = useLocale();

  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: () => {
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
    onSettled: async () => {
      await utils.viewer.public.i18n.invalidate();
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
      timeZone: user.timeZone || "",
      timeFormat: {
        value: user.timeFormat || 12,
        label: timeFormatOptions.find((option) => option.value === user.timeFormat)?.label || 12,
      },
      weekStart: {
        value: user.weekStart,
        label: nameOfDay(localeProp, user.weekStart === "Sunday" ? 0 : 1),
      },
    },
  });

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
      <Meta title="General" description="Manage settings for your language and timezone" />
      <Controller
        name="locale"
        render={({ field: { value, onChange } }) => (
          <>
            <Label className="text-gray-900">
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
            <Label className="mt-8 text-gray-900">
              <>{t("timezone")}</>
            </Label>
            <TimezoneSelect
              id="timezone"
              value={value}
              onChange={(event) => {
                if (event) formMethods.setValue("timeZone", event.value);
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
            <Label className="mt-8 text-gray-900">
              <>{t("time_format")}</>
            </Label>
            <Select
              value={value}
              options={timeFormatOptions}
              onChange={(event) => {
                if (event) formMethods.setValue("timeFormat", { ...event });
              }}
            />
          </>
        )}
      />
      <div className="text-gray mt-2 flex items-center text-sm text-gray-700">
        {t("timeformat_profile_hint")}
      </div>
      <Controller
        name="weekStart"
        control={formMethods.control}
        render={({ field: { value } }) => (
          <>
            <Label className="mt-8 text-gray-900">
              <>{t("start_of_week")}</>
            </Label>
            <Select
              value={value}
              options={weekStartOptions}
              onChange={(event) => {
                if (event) formMethods.setValue("weekStart", { ...event });
              }}
            />
          </>
        )}
      />
      <Button color="primary" type="submit" className="mt-8">
        <>{t("update")}</>
      </Button>
    </Form>
  );
};

GeneralQueryView.getLayout = getLayout;

export default GeneralQueryView;
