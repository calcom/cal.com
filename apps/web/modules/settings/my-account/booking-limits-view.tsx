"use client";

import { useForm, Controller } from "react-hook-form";

import { IntervalLimitsManager } from "@calcom/features/eventtypes/components/tabs/limits/EventLimitsTab";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { validateIntervalLimitOrder, parseBookingLimit, classNames } from "@calcom/lib";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { IntervalLimit } from "@calcom/types/Calendar";
import { Button, Form, Meta, SkeletonContainer, SkeletonText, showToast, SettingsToggle } from "@calcom/ui";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} borderInShellHeader={false} />
      <div className="border-subtle mt-6 flex flex-col rounded-lg border px-4 py-6 sm:px-6">
        <SkeletonText className="h-6 w-1/4" />
        <SkeletonText className="mt-2 h-6 w-2/5" />
      </div>
    </SkeletonContainer>
  );
};

const BookingsView = ({ bookingLimits }: { bookingLimits: IntervalLimit }) => {
  const { t } = useLocale();
  const bookingsLimitFormMethods = useForm({
    defaultValues: {
      bookingLimits,
    },
  });

  const utils = trpc.useUtils();
  const updateProfileMutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.viewer.me.invalidate();
      bookingsLimitFormMethods.reset(bookingsLimitFormMethods.getValues());
      showToast(t("booking_limits_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("failed_to_save_global_settings"), "error");
    },
  });

  const handleSubmit = async (values: { bookingLimits: IntervalLimit }) => {
    const { bookingLimits } = values;
    const parsedBookingLimits = parseBookingLimit(bookingLimits) || {};
    if (bookingLimits) {
      const isValid = validateIntervalLimitOrder(parsedBookingLimits);
      if (!isValid) throw new Error(t("event_setup_booking_limits_error"));
    }
    updateProfileMutation.mutate({ ...values, bookingLimits: parsedBookingLimits });
  };

  return (
    <div>
      <Meta
        title={t("booking_limits")}
        description={t("bookings_settings_description", { appName: APP_NAME })}
        borderInShellHeader={false}
      />
      <Form form={bookingsLimitFormMethods} handleSubmit={handleSubmit}>
        <Controller
          name="bookingLimits"
          render={({ field: { value } }) => {
            const isChecked = Object.keys(value ?? {}).length > 0;
            return (
              <SettingsToggle
                toggleSwitchAtTheEnd={true}
                labelClassName="text-sm"
                title={t("limit_booking_frequency")}
                description={t("global_limit_booking_frequency_description")}
                checked={isChecked}
                onCheckedChange={(active) => {
                  if (active) {
                    bookingsLimitFormMethods.setValue("bookingLimits", {
                      PER_DAY: 1,
                    });
                  } else {
                    bookingsLimitFormMethods.setValue("bookingLimits", {});
                  }
                  handleSubmit(bookingsLimitFormMethods.getValues());
                }}
                switchContainerClassName={classNames(
                  "border-subtle mt-6 rounded-lg border py-6 px-4 sm:px-6",
                  isChecked && "rounded-b-none"
                )}
                childrenClassName="lg:ml-0">
                <div className="border-subtle border border-y-0 p-6">
                  <IntervalLimitsManager propertyName="bookingLimits" defaultLimit={1} step={1} />
                </div>
                <SectionBottomActions align="end">
                  <Button
                    color="primary"
                    type="submit"
                    loading={updateProfileMutation.isPending}
                    disabled={!bookingsLimitFormMethods.formState.dirtyFields.bookingLimits}>
                    {t("update")}
                  </Button>
                </SectionBottomActions>
              </SettingsToggle>
            );
          }}
        />
      </Form>
    </div>
  );
};

const BookingLimitsPage = () => {
  const { data, isPending } = trpc.viewer.me.useQuery();

  const { t } = useLocale();

  if (isPending || !data)
    return (
      <SkeletonLoader
        title={t("bookings")}
        description={t("bookings_settings_description", { appName: APP_NAME })}
      />
    );

  return <BookingsView bookingLimits={data.bookingLimits} />;
};

export default BookingLimitsPage;
