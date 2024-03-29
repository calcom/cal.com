import { useForm } from "react-hook-form";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button, Form, Meta, Label, SkeletonContainer, SkeletonText } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import {
  MinimumBookingNoticeInput,
  BookingLimits,
  BufferBeforeAndAfter,
  FutureBookingLimits,
} from "@components/eventtype/EventLimitsTab";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} borderInShellHeader={false} />
      <div className="border-subtle mt-6 flex flex-col rounded-lg border px-4 py-6 sm:px-6">
        <SkeletonText className="h-6 w-1/4" />
        <SkeletonText className="mt-2 h-6 w-2/5" />
      </div>
      <div className="border-subtle mt-6 flex flex-col rounded-lg border px-4 py-6 sm:px-6">
        <SkeletonText className="h-6 w-1/4" />
        <SkeletonText className="mt-2 h-6 w-2/5" />
      </div>
    </SkeletonContainer>
  );
};

const BookingsView = ({ user }): { user: RouterOutputs["viewer"]["me"] } => {
  const { t } = useLocale();
  const bookingsLimitFormMethods = useForm({
    defaultValues: {
      bookingLimits: user.globalSettings?.bookingLimits,
    },
  });
  const bookingFutureLimitFormMethods = useForm({
    defaultValues: {
      periodType: user.globalSettings?.periodType,
      periodCountCalendarDays: !!user.globalSettings?.periodCountCalendarDays,
      periodDays: user.globalSettings?.periodDays,
      periodDates: {
        startDate: user.globalSettings?.periodStartDate,
        endDate: user.globalSettings?.periodEndDate,
      },
      minimumBookingNotice: user.globalSettings?.minimumBookingNotice,
      beforeEventBuffer: user.globalSettings?.beforeEventBuffer,
      afterEventBuffer: user.globalSettings?.afterEventBuffer,
    },
  });

  const utils = trpc.useContext();
  const updateProfileMutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: async (res) => {
      await utils.viewer.me.invalidate();
      bookingsLimitFormMethods.reset(bookingsLimitFormMethods.getValues());
      bookingFutureLimitFormMethods.reset(bookingFutureLimitFormMethods.getValues());
    },
  });

  const watchBookingLimits = bookingsLimitFormMethods.watch("bookingLimits");
  const watchPeriodType = bookingFutureLimitFormMethods.watch("periodType");

  const showLimitFrequency = Object.keys(watchBookingLimits ?? {}).length > 0;
  const showLimitFutureBookings = watchPeriodType && watchPeriodType !== "UNLIMITED";

  return (
    <div>
      <Meta
        title={t("bookings")}
        description={t("bookings_settings_description", { appName: APP_NAME })}
        borderInShellHeader={false}
      />
      <Form
        form={bookingsLimitFormMethods}
        handleSubmit={async (values) => {
          console.log(values);
          updateProfileMutation.mutate(values);
        }}>
        <BookingLimits
          formMethods={bookingsLimitFormMethods}
          childrenContainerClassName="rounded-none border-b-0"
        />
        {showLimitFrequency && (
          <SectionBottomActions align="end">
            <Button
              color="primary"
              type="submit"
              loading={updateProfileMutation.isPending}
              disabled={!bookingsLimitFormMethods.formState.dirtyFields.bookingLimits}>
              {t("update")}
            </Button>
          </SectionBottomActions>
        )}
      </Form>

      <Form
        form={bookingFutureLimitFormMethods}
        handleSubmit={(values) => {
          console.log(values);
          updateProfileMutation.mutate({
            futureBookingLimits: values,
          });
        }}>
        <FutureBookingLimits
          formMethods={bookingFutureLimitFormMethods}
          childrenContainerClassName="rounded-none border-b-0">
          <div className="mt-4 flex flex-col">
            <Label className="text-emphasis text-sm font-medium leading-none">{t("buffer_limits")}</Label>
            <div className="bg-muted rounded-md p-4">
              <BufferBeforeAndAfter />
              <div className="mt-4 flex flex-col space-y-4 lg:flex-row lg:space-x-4 lg:space-y-0">
                <div className="w-2/4">
                  <Label htmlFor="minimumBookingNotice">{t("minimum_booking_notice")}</Label>
                  <MinimumBookingNoticeInput
                    {...bookingFutureLimitFormMethods.register("minimumBookingNotice")}
                  />
                </div>
              </div>
            </div>
          </div>
        </FutureBookingLimits>
        {showLimitFutureBookings && (
          <SectionBottomActions align="end">
            <Button
              color="primary"
              type="submit"
              loading={updateProfileMutation.isPending}
              disabled={!Object.keys(bookingFutureLimitFormMethods.formState.dirtyFields).length}>
              {t("update")}
            </Button>
          </SectionBottomActions>
        )}
      </Form>
    </div>
  );
};

const BookingsViewWrapper = () => {
  const { data: user, isPending } = trpc.viewer.me.useQuery();

  const { t } = useLocale();

  if (isPending || !user)
    return (
      <SkeletonLoader
        title={t("bookings")}
        description={t("bookings_settings_description", { appName: APP_NAME })}
      />
    );

  return <BookingsView user={user} />;
};

BookingsViewWrapper.getLayout = getLayout;
BookingsViewWrapper.PageWrapper = PageWrapper;

export default BookingsViewWrapper;
