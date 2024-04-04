import { useState } from "react";
import { useForm, Controller } from "react-hook-form";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { classNames } from "@calcom/lib";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
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
import { ExternalLink } from "@calcom/ui/components/icon";

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
  const [showSyncBookingLimits, setShowSyncBookingLimits] = useState(false);
  const { globalSettings, eventTypeGroups, eventCount } = data;
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
        startDate: globalSettings?.periodStartDate,
        endDate: globalSettings?.periodEndDate,
      },
      minimumBookingNotice: globalSettings?.minimumBookingNotice,
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
  });

  const syncBookingLimitsMutation = trpc.viewer.syncBookingLimits.useMutation({
    onSuccess: async (res) => {
      setShowSyncBookingLimits(false);
      await utils.viewer.globalSettings.invalidate();
      showToast(res.message, "success");
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
          sectionDescription="global_limit_booking_frequency_description"
          childrenContainerClassName="rounded-none border-b-0">
          {eventCount > 0 && (
            <div className="flex">
              <span className="text-subtle text-sm font-normal">
                {t("event_type_different_limiting_frequencies", { eventCount })}
              </span>
              &nbsp;
              <span
                className="cursor-pointer text-sm font-normal text-[#101010] underline"
                onClick={() => setShowSyncBookingLimits(true)}>
                {t("review")}
              </span>
            </div>
          )}
        </BookingLimits>
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
          sectionDescription="global_limit_future_booking_frequency_description"
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
      <Dialog open={showSyncBookingLimits} onOpenChange={setShowSyncBookingLimits}>
        <DialogContent
          title={t("sync_booking_frequencies")}
          description={t("event_types_different_layouts")}
          type="creation"
          enableOverflow>
          <Form
            form={bookingsLimitFormMethods}
            handleSubmit={(values) => {
              console.log(values);
              syncBookingLimitsMutation.mutate({
                eventIds: bookingsLimitFormMethods.getValues("syncBookingLimitsEventIds"),
              });
            }}>
            <div className="flex flex-col">
              {eventTypeGroups.map((eventGroup, index) => (
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
                          StartIcon={ExternalLink}
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
