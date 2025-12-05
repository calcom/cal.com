"use client";

import { useForm, Controller } from "react-hook-form";

import { IntervalLimitsManager } from "@calcom/features/eventtypes/components/tabs/limits/EventLimitsTab";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { parseBookingLimit } from "@calcom/lib/intervalLimits/isBookingLimits";
import { validateIntervalLimitOrder } from "@calcom/lib/intervalLimits/validateIntervalLimitOrder";
import { trpc } from "@calcom/trpc/react";
import type { IntervalLimit } from "@calcom/types/Calendar";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Form, SettingsToggle } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

const GlobalBookingLimitsController = ({
  bookingLimits,
}: {
  bookingLimits: IntervalLimit | null | undefined;
}) => {
  const { t } = useLocale();
  const safeBookingLimits = bookingLimits ?? {};
  const bookingsLimitFormMethods = useForm({
    defaultValues: {
      bookingLimits: safeBookingLimits,
    },
  });

  const utils = trpc.useUtils();
  const updateProfileMutation = trpc.viewer.me.updateProfile.useMutation({
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
    <Form form={bookingsLimitFormMethods} handleSubmit={handleSubmit}>
      <Controller
        name="bookingLimits"
        render={({ field: { value } }) => {
          const isChecked = Object.keys(value ?? {}).length > 0;
          return (
            <SettingsToggle
              toggleSwitchAtTheEnd={true}
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
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
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
  );
};

export default GlobalBookingLimitsController;
