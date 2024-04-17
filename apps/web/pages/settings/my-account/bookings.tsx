import { useState } from "react";
import { useForm, Controller } from "react-hook-form";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { classNames, validateIntervalLimitOrder, parseBookingLimit } from "@calcom/lib";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { IntervalLimit } from "@calcom/types/Calendar";
import {
  Avatar,
  Button,
  Form,
  Meta,
  Label,
  SkeletonContainer,
  SkeletonText,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
  CheckboxField,
  showToast,
} from "@calcom/ui";

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

const BookingsView = ({ data }: { data: RouterOutputs["viewer"]["globalSettings"] }) => {
  const { t } = useLocale();
  const [showSyncBookingLimits, setShowSyncBookingLimits] = useState<
    | {
        title: string;
        data: RouterOutputs["viewer"]["globalSettings"]["bookingFreqEventTypeGroups"];
        isFuture: boolean;
      }
    | undefined
  >();
  const {
    globalSettings,
    bookingFreqEventTypeGroups,
    bookingFreqLimitCount,
    futureBookingEventTypeGroups,
    futureBookingLimitsCount,
  } = data;
  const bookingsLimitFormMethods = useForm({
    defaultValues: {
      bookingLimits: globalSettings?.bookingLimits,
      syncBookingLimitsEventIds: [] as number[],
    },
  });
  const bookingFutureLimitFormMethods = useForm({
    defaultValues: {
      periodType: globalSettings?.periodType,
      periodCountCalendarDays: !!globalSettings?.periodCountCalendarDays,
      periodDays: globalSettings?.periodDays,
      periodDates: {
        startDate: globalSettings?.periodStartDate ?? new Date(),
        endDate: globalSettings?.periodEndDate ?? new Date(),
      },
      minimumBookingNotice: globalSettings?.minimumBookingNotice || 120,
      beforeEventBuffer: globalSettings?.beforeEventBuffer,
      afterEventBuffer: globalSettings?.afterEventBuffer,
    },
  });

  const utils = trpc.useContext();
  const updateProfileMutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.viewer.globalSettings.invalidate();
      bookingsLimitFormMethods.reset(bookingsLimitFormMethods.getValues());
      bookingFutureLimitFormMethods.reset(bookingFutureLimitFormMethods.getValues());
    },
    onError: () => {
      showToast(t("failed_to_save_global_settings"), "error");
    },
  });

  const syncBookingLimitsMutation = trpc.viewer.syncBookingLimits.useMutation({
    onSuccess: async (res) => {
      setShowSyncBookingLimits(undefined);
      await utils.viewer.globalSettings.invalidate();
      showToast(res.message, "success");
      bookingsLimitFormMethods.reset();
      bookingFutureLimitFormMethods.reset();
    },
    onError: () => {
      showToast(t("failed_to_sync_events_with_global_settings"), "error");
    },
  });

  const watchBookingLimits = bookingsLimitFormMethods.watch("bookingLimits");
  const watchPeriodType = bookingFutureLimitFormMethods.watch("periodType");

  const showLimitFrequency = Object.keys(watchBookingLimits ?? {}).length > 0;
  const showLimitFutureBookings = watchPeriodType && watchPeriodType !== "UNLIMITED";

  const getEventsNotSyncedBanner = (eventCount: number, onClick: () => void) => {
    if (!eventCount) {
      return null;
    }

    return (
      <div className="flex items-center">
        <span className="text-subtle text-sm font-normal">
          {t("event_type_different_limiting_frequencies", { eventCount })}
        </span>
        &nbsp;
        <span className="cursor-pointer text-sm font-normal text-[#101010] underline" onClick={onClick}>
          {t("review")}
        </span>
      </div>
    );
  };

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
          const { bookingLimits } = values;
          const parsedBookingLimits = parseBookingLimit(bookingLimits) || {};
          if (bookingLimits) {
            const isValid = validateIntervalLimitOrder(parsedBookingLimits);
            if (!isValid) throw new Error(t("event_setup_booking_limits_error"));
          }
          updateProfileMutation.mutate({ ...values, bookingLimits: parsedBookingLimits });
        }}>
        <BookingLimits
          sectionDescription="global_limit_booking_frequency_description"
          settingsToggleClass="rounded-b-none"
          onCheckedChange={(key: string, value: IntervalLimit, shouldDirty: boolean) =>
            bookingsLimitFormMethods.setValue(key as "bookingLimits", value, { shouldDirty })
          }
          childrenContainerClassName="rounded-none border-b-0">
          {getEventsNotSyncedBanner(bookingFreqLimitCount, () =>
            setShowSyncBookingLimits({
              title: "sync_booking_frequencies",
              data: bookingFreqEventTypeGroups,
              isFuture: false,
            })
          )}
        </BookingLimits>
        <SectionBottomActions align="end" className={!showLimitFrequency ? "border-t-0" : ""}>
          <Button
            color="primary"
            type="submit"
            loading={updateProfileMutation.isPending}
            disabled={!bookingsLimitFormMethods.formState.dirtyFields.bookingLimits}>
            {t("update")}
          </Button>
        </SectionBottomActions>
      </Form>

      <Form
        form={bookingFutureLimitFormMethods}
        handleSubmit={(values) =>
          updateProfileMutation.mutate({
            futureBookingLimits: {
              ...values,
              periodDays: values.periodDays ?? undefined,
            },
          })
        }>
        <FutureBookingLimits
          formMethods={bookingFutureLimitFormMethods}
          sectionDescription="global_limit_future_booking_frequency_description"
          settingsToggleClass="rounded-b-none"
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
          {getEventsNotSyncedBanner(futureBookingLimitsCount, () =>
            setShowSyncBookingLimits({
              title: "sync_future_frequencies",
              data: futureBookingEventTypeGroups,
              isFuture: true,
            })
          )}
        </FutureBookingLimits>
        <SectionBottomActions align="end" className={!showLimitFutureBookings ? "border-t-0" : ""}>
          <Button
            color="primary"
            type="submit"
            loading={updateProfileMutation.isPending}
            disabled={!Object.keys(bookingFutureLimitFormMethods.formState.dirtyFields).length}>
            {t("update")}
          </Button>
        </SectionBottomActions>
      </Form>
      <Dialog
        open={!!showSyncBookingLimits}
        onOpenChange={(open) => {
          if (!open) {
            setShowSyncBookingLimits(undefined);
            bookingsLimitFormMethods.setValue("syncBookingLimitsEventIds", [], { shouldDirty: true });
          }
        }}>
        <DialogContent
          title={showSyncBookingLimits?.title ? t(showSyncBookingLimits.title) : ""}
          description={t("event_types_different_layouts")}
          type="creation"
          enableOverflow>
          <Form
            form={bookingsLimitFormMethods}
            handleSubmit={() =>
              syncBookingLimitsMutation.mutate({
                eventIds: bookingsLimitFormMethods.getValues("syncBookingLimitsEventIds"),
                isFuture: !!showSyncBookingLimits?.isFuture,
              })
            }>
            <div className="flex flex-col">
              {(showSyncBookingLimits?.data || []).map((eventGroup, index) => (
                <div className="mb-2 flex flex-col" key={`eventGroup-${index}`}>
                  <div className="flex items-center px-3 py-1.5">
                    <Avatar
                      alt={eventGroup.profile.name || ""}
                      imageSrc={eventGroup.profile.image}
                      size="xs"
                      className="inline-flex justify-center"
                    />
                    <span className="ml-3 text-sm font-medium text-[#4B5563]">{eventGroup.profile.name}</span>
                  </div>
                  <div className="mt-2 flex flex-col rounded-md border">
                    {eventGroup.eventTypes.map((eventType, index) => (
                      <div
                        className={classNames(
                          "flex flex-1 items-center p-4",
                          index !== eventGroup.eventTypes.length - 1 ? "border-b" : ""
                        )}
                        key={eventType.id}>
                        <Controller
                          name="syncBookingLimitsEventIds"
                          control={bookingsLimitFormMethods.control}
                          render={() => (
                            <CheckboxField
                              defaultChecked={bookingsLimitFormMethods
                                .getValues("syncBookingLimitsEventIds")
                                .includes(eventType.id)}
                              onChange={(e) => {
                                const oldValue = new Set(
                                  bookingsLimitFormMethods.getValues("syncBookingLimitsEventIds")
                                );
                                if (e.target.checked) {
                                  oldValue.add(eventType.id);
                                } else {
                                  oldValue.delete(eventType.id);
                                }
                                bookingsLimitFormMethods.setValue(
                                  "syncBookingLimitsEventIds",
                                  Array.from(oldValue),
                                  { shouldDirty: true }
                                );
                              }}
                              description=""
                            />
                          )}
                        />
                        <span className="flex-1 text-sm font-semibold text-[#101010]">{eventType.title}</span>
                        <Button
                          target="_blank"
                          variant="icon"
                          color="minimal"
                          StartIcon="external-link"
                          href={`/event-types/${eventType.id}?tabName=limits`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <DialogClose>{t("cancel")}</DialogClose>
              <Button
                type="submit"
                color="primary"
                disabled={!bookingsLimitFormMethods.formState.dirtyFields.syncBookingLimitsEventIds}
                loading={syncBookingLimitsMutation.isPending}>
                {t("sync_selected_event_types")}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const BookingsViewWrapper = () => {
  const { data, isPending } = trpc.viewer.globalSettings.useQuery();

  const { t } = useLocale();

  if (isPending || !data)
    return (
      <SkeletonLoader
        title={t("bookings")}
        description={t("bookings_settings_description", { appName: APP_NAME })}
      />
    );

  return <BookingsView data={data} />;
};

BookingsViewWrapper.getLayout = getLayout;
BookingsViewWrapper.PageWrapper = PageWrapper;

export default BookingsViewWrapper;
