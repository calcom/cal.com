import { useForm } from "react-hook-form";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Form, Meta, Label } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import {
  MinimumBookingNoticeInput,
  BookingLimits,
  BufferBeforeAndAfter,
  FutureBookingLimits,
} from "@components/eventtype/EventLimitsTab";

const BookingsView = () => {
  const { t } = useLocale();
  const bookingsLimitFormMethods = useForm();
  const bookingFutureLimitFormMethods = useForm({
    defaultValues: {
      periodType: "UNLIMITED",
      periodCountCalendarDays: false,
      periodDays: 30,
      periodDates: {
        startDate: new Date(),
        endDate: new Date(),
      },
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
        handleSubmit={(values) => {
          console.log(values);
        }}>
        <BookingLimits
          formMethods={bookingsLimitFormMethods}
          childrenContainerClassName="rounded-none border-b-0"
        />
        {showLimitFrequency && (
          <SectionBottomActions align="end">
            <Button color="primary" type="submit" data-testid="profile-submit-button">
              {t("update")}
            </Button>
          </SectionBottomActions>
        )}
      </Form>

      <Form
        form={bookingFutureLimitFormMethods}
        handleSubmit={(values) => {
          console.log(values);
        }}>
        <FutureBookingLimits
          formMethods={bookingFutureLimitFormMethods}
          childrenContainerClassName="rounded-none border-b-0">
          <div className="mt-4 flex flex-col">
            <Label className="text-emphasis text-sm font-medium leading-none">Buffer Limits</Label>
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
            <Button color="primary" type="submit" data-testid="profile-submit-button">
              {t("update")}
            </Button>
          </SectionBottomActions>
        )}
      </Form>
    </div>
  );
};

const BookingsViewWrapper = () => {
  return <BookingsView />;
};

BookingsViewWrapper.getLayout = getLayout;
BookingsViewWrapper.PageWrapper = PageWrapper;

export default BookingsViewWrapper;
