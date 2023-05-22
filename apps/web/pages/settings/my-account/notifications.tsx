import { Controller, useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { useScheduleOptions } from "@calcom/features/schedules/components/Schedule";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Form,
  Label,
  Meta,
  Select,
  SettingsToggle,
  showToast,
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
} from "@calcom/ui";

import { withQuery } from "@lib/QueryCell";

import PageWrapper from "@components/PageWrapper";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} />
      <div className="mt-2 mb-8 space-y-6">
        <SkeletonText className="h-12 w-full" />

        <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
      </div>
    </SkeletonContainer>
  );
};

interface NotificationsViewProps {
  user: RouterOutputs["viewer"]["me"];
}

const WithQuery = withQuery(trpc.viewer.public.i18n, undefined, { trpc: { context: { skipBatch: true } } });

const NotificationsQueryView = () => {
  const { t } = useLocale();

  const { data: user, isLoading } = trpc.viewer.me.useQuery();
  if (isLoading)
    return <SkeletonLoader title={t("notifications")} description={t("notifications_description")} />;
  if (!user) {
    throw new Error(t("something_went_wrong"));
  }
  return (
    <WithQuery
      success={() => <NotificationsView user={user} />}
      customLoader={
        <SkeletonLoader title={t("notifications")} description={t("notifications_description")} />
      }
    />
  );
};

const NotificationsView = ({ user }: NotificationsViewProps) => {
  const utils = trpc.useContext();
  const { t } = useLocale();

  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: async () => {
      // Invalidate our previous i18n cache
      await utils.viewer.public.i18n.invalidate();
      reset(getValues());
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
    onSettled: async () => {
      await utils.viewer.public.i18n.invalidate();
    },
  });

  const { options: dailyDigestTimeOptions } = useScheduleOptions();

  // User time will be epoch + time
  const userDailyDigestTime = user.dailyDigestTime
    ? dayjs().utc().startOf("day").add(user.dailyDigestTime.getTime()).toDate().valueOf()
    : undefined;
  const ninePm = dayjs().utc().startOf("day").add(21, "hours").valueOf();

  const formMethods = useForm({
    defaultValues: {
      dailyDigestEnabled: user.dailyDigestEnabled,
      dailyDigestTime: dailyDigestTimeOptions.find(
        (option) => option.value === userDailyDigestTime ?? ninePm
      ),
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
          dailyDigestEnabled: values.dailyDigestEnabled ?? undefined,
          dailyDigestTime: values.dailyDigestTime ? dayjs(values.dailyDigestTime.value).toDate() : undefined,
        });
      }}>
      <Meta title={t("notifications")} description={t("notifications_description")} />
      <Controller
        name="dailyDigestEnabled"
        control={formMethods.control}
        render={({ field: { value } }) => (
          <SettingsToggle
            title={t("daily_digest_enabled_label")}
            description={t("daily_digest_enabled_description")}
            checked={value}
            onCheckedChange={(bool) =>
              formMethods.setValue("dailyDigestEnabled", bool, { shouldDirty: true })
            }>
            <Controller
              name="dailyDigestTime"
              control={formMethods.control}
              render={({ field: { value, onChange } }) => (
                <>
                  <Label>{t("daily_digest_time_label")}</Label>
                  <Select
                    required
                    isSearchable={false}
                    options={dailyDigestTimeOptions}
                    value={value}
                    onChange={onChange}
                  />
                </>
              )}
            />
          </SettingsToggle>
        )}
      />
      <Button disabled={isDisabled} color="primary" type="submit" className="mt-8">
        <>{t("update")}</>
      </Button>
    </Form>
  );
};

NotificationsQueryView.getLayout = getLayout;
NotificationsQueryView.PageWrapper = PageWrapper;

export default NotificationsQueryView;
