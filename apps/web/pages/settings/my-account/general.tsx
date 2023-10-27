import { useSession } from "next-auth/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localeOptions } from "@calcom/lib/i18n";
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
  SettingsToggle,
} from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} borderInShellHeader={true} />
      <div className="border-subtle space-y-6 rounded-b-xl border border-t-0 px-4 py-8 sm:px-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />

        <SkeletonButton className="ml-auto h-8 w-20 rounded-md p-5" />
      </div>
    </SkeletonContainer>
  );
};

interface GeneralViewProps {
  localeProp: string;
  user: RouterOutputs["viewer"]["me"];
}

const GeneralQueryView = () => {
  const { t } = useLocale();

  const { data: user, isLoading } = trpc.viewer.me.useQuery();
  if (isLoading) return <SkeletonLoader title={t("general")} description={t("general_description")} />;
  if (!user) {
    throw new Error(t("something_went_wrong"));
  }
  return <GeneralView user={user} localeProp={user.locale} />;
};

const GeneralView = ({ localeProp, user }: GeneralViewProps) => {
  const utils = trpc.useContext();
  const { t } = useLocale();
  const { update } = useSession();
  const [isUpdateBtnLoading, setIsUpdateBtnLoading] = useState<boolean>(false);

  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: async (res) => {
      await utils.viewer.me.invalidate();
      reset(getValues());
      showToast(t("settings_updated_successfully"), "success");
      await update(res);

      if (res.locale) {
        window.calNewLocale = res.locale;
      }
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
    onSettled: async () => {
      await utils.viewer.me.invalidate();
      setIsUpdateBtnLoading(false);
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
  const {
    formState: { isDirty, isSubmitting },
    reset,
    getValues,
  } = formMethods;
  const isDisabled = isSubmitting || !isDirty;

  const [isAllowDynamicBookingChecked, setIsAllowDynamicBookingChecked] = useState(
    !!user.allowDynamicBooking
  );
  const [isAllowSEOIndexingChecked, setIsAllowSEOIndexingChecked] = useState(!!user.allowSEOIndexing);
  const [isReceiveMonthlyDigestEmailChecked, setIsReceiveMonthlyDigestEmailChecked] = useState(
    !!user.receiveMonthlyDigestEmail
  );

  return (
    <div>
      <Form
        form={formMethods}
        handleSubmit={(values) => {
          setIsUpdateBtnLoading(true);
          mutation.mutate({
            ...values,
            locale: values.locale.value,
            timeFormat: values.timeFormat.value,
            weekStart: values.weekStart.value,
          });
        }}>
        <Meta title={t("general")} description={t("general_description")} borderInShellHeader={true} />
        <div className="border-subtle border-x border-y-0 px-4 py-8 sm:px-6">
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
                <Label className="text-emphasis mt-6">
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
          <Button loading={isUpdateBtnLoading} disabled={isDisabled} color="primary" type="submit">
            <>{t("update")}</>
          </Button>
        </SectionBottomActions>
      </Form>

      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("dynamic_booking")}
        description={t("allow_dynamic_booking")}
        disabled={mutation.isLoading}
        checked={isAllowDynamicBookingChecked}
        onCheckedChange={(checked) => {
          setIsAllowDynamicBookingChecked(checked);
          mutation.mutate({ allowDynamicBooking: checked });
        }}
        switchContainerClassName="mt-6"
      />

      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("seo_indexing")}
        description={t("allow_seo_indexing")}
        disabled={mutation.isLoading}
        checked={isAllowSEOIndexingChecked}
        onCheckedChange={(checked) => {
          setIsAllowSEOIndexingChecked(checked);
          mutation.mutate({ allowSEOIndexing: checked });
        }}
        switchContainerClassName="mt-6"
      />

      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("monthly_digest_email")}
        description={t("monthly_digest_email_for_teams")}
        disabled={mutation.isLoading}
        checked={isReceiveMonthlyDigestEmailChecked}
        onCheckedChange={(checked) => {
          setIsReceiveMonthlyDigestEmailChecked(checked);
          mutation.mutate({ receiveMonthlyDigestEmail: checked });
        }}
        switchContainerClassName="mt-6"
      />
    </div>
  );
};

GeneralQueryView.getLayout = getLayout;
GeneralQueryView.PageWrapper = PageWrapper;

export default GeneralQueryView;
