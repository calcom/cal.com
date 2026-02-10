import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import { Timezone as PlatformTimzoneSelect } from "@calcom/atoms/timezone";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { LearnMoreLink } from "@calcom/features/eventtypes/components/LearnMoreLink";
import type {
  EventTypeSetupProps,
  FormValues,
  SettingsToggleClassNames,
} from "@calcom/features/eventtypes/lib/types";
import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { extractHostTimezone } from "@calcom/lib/hashedLinksUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Label, SettingsToggle } from "@calcom/ui/components/form";
import { MultiplePrivateLinksController } from "@calcom/web/modules/event-types/components/MultiplePrivateLinksController";
import { TimezoneSelect as WebTimezoneSelect } from "@calcom/web/modules/timezone/components/TimezoneSelect";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { DisableReschedulingCustomClassNames } from "../advanced/DisableReschedulingController";
import DisableReschedulingController from "../advanced/DisableReschedulingController";
import type { RequiresConfirmationCustomClassNames } from "../advanced/RequiresConfirmationController";
import RequiresConfirmationController from "../advanced/RequiresConfirmationController";

export type EventPrivacyTabCustomClassNames = {
  requiresConfirmation?: RequiresConfirmationCustomClassNames;
  disableRescheduling?: DisableReschedulingCustomClassNames;
  bookerEmailVerification?: SettingsToggleClassNames;
  calendarNotes?: SettingsToggleClassNames;
  eventDetailsVisibility?: SettingsToggleClassNames;
  hideOrganizerEmail?: SettingsToggleClassNames;
  timezoneLock?: SettingsToggleClassNames;
};

export type EventPrivacyTabProps = {
  eventType: EventTypeSetupProps["eventType"];
  team: EventTypeSetupProps["team"];
  customClassNames?: EventPrivacyTabCustomClassNames;
};

export const EventPrivacyTab = ({ eventType, team, customClassNames }: EventPrivacyTabProps) => {
  const isPlatform = useIsPlatform();
  const formMethods = useFormContext<FormValues>();
  const { t } = useLocale();

  const [requiresConfirmation, setRequiresConfirmation] = useState(
    formMethods.getValues("requiresConfirmation")
  );
  const seatsEnabled = formMethods.watch("seatsPerTimeSlotEnabled");

  const [disableRescheduling, setDisableRescheduling] = useState(eventType.disableRescheduling || false);

  const [multiplePrivateLinksVisible, setMultiplePrivateLinksVisible] = useState(
    !!formMethods.getValues("multiplePrivateLinks") &&
      formMethods.getValues("multiplePrivateLinks")?.length !== 0
  );

  const {
    isChildrenManagedEventType: _isChildrenManagedEventType,
    isManagedEventType,
    shouldLockDisableProps,
  } = useLockedFieldsManager({
    eventType,
    translate: t,
    formMethods,
  });

  const requiresBookerEmailVerificationProps = shouldLockDisableProps("requiresBookerEmailVerification");
  const hideCalendarNotesLocked = shouldLockDisableProps("hideCalendarNotes");
  const hideCalendarEventDetailsLocked = shouldLockDisableProps("hideCalendarEventDetails");
  const hideOrganizerEmailLocked = shouldLockDisableProps("hideOrganizerEmail");
  const lockTimeZoneToggleOnBookingPageLocked = shouldLockDisableProps("lockTimeZoneToggleOnBookingPage");
  const multiplePrivateLinksLocked = shouldLockDisableProps("multiplePrivateLinks");
  const reschedulingPastBookingsLocked = shouldLockDisableProps("allowReschedulingPastBookings");
  const disableCancellingLocked = shouldLockDisableProps("disableCancelling");
  const allowReschedulingCancelledBookingsLocked = shouldLockDisableProps(
    "allowReschedulingCancelledBookings"
  );

  if (isManagedEventType) {
    multiplePrivateLinksLocked.disabled = true;
  }

  const [allowReschedulingCancelledBookings, setAllowReschedulingCancelledBookings] = useState(
    eventType.allowReschedulingCancelledBookings ?? false
  );

  const userTimeZone = extractHostTimezone({
    userId: eventType.userId,
    teamId: eventType.teamId,
    hosts: eventType.hosts,
    owner: eventType.owner,
    team: eventType.team,
  });

  const TimezoneSelect = isPlatform ? PlatformTimzoneSelect : WebTimezoneSelect;

  return (
    <div className="stack-y-4 flex flex-col">
      <RequiresConfirmationController
        eventType={eventType}
        seatsEnabled={seatsEnabled}
        metadata={formMethods.getValues("metadata")}
        requiresConfirmation={requiresConfirmation}
        requiresConfirmationWillBlockSlot={formMethods.getValues("requiresConfirmationWillBlockSlot")}
        onRequiresConfirmation={setRequiresConfirmation}
        customClassNames={customClassNames?.requiresConfirmation}
      />

      {!isPlatform && (
        <>
          <Controller
            name="disabledCancelling"
            render={({ field: { onChange, value } }) => (
              <SettingsToggle
                labelClassName="text-sm"
                toggleSwitchAtTheEnd={true}
                switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
                title={t("disable_cancelling")}
                data-testid="disable-cancelling-toggle"
                {...disableCancellingLocked}
                description={
                  <LearnMoreLink
                    t={t}
                    i18nKey="description_disable_cancelling"
                    href="https://cal.com/help/event-types/disable-canceling-rescheduling#disable-cancelling"
                  />
                }
                checked={value}
                onCheckedChange={(val) => {
                  onChange(val);
                }}
              />
            )}
          />

          <DisableReschedulingController
            eventType={eventType}
            disableRescheduling={disableRescheduling}
            onDisableRescheduling={setDisableRescheduling}
            customClassNames={customClassNames?.disableRescheduling}
          />
        </>
      )}

      <Controller
        name="requiresBookerEmailVerification"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName={classNames("text-sm", customClassNames?.bookerEmailVerification?.label)}
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames(
              "border-subtle rounded-lg border py-6 px-4 sm:px-6",
              customClassNames?.bookerEmailVerification?.container
            )}
            title={t("requires_booker_email_verification")}
            data-testid="requires-booker-email-verification"
            {...requiresBookerEmailVerificationProps}
            description={t("description_requires_booker_email_verification")}
            descriptionClassName={customClassNames?.bookerEmailVerification?.description}
            checked={value}
            onCheckedChange={(e) => onChange(e)}
          />
        )}
      />

      <Controller
        name="hideCalendarNotes"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName={classNames("text-sm", customClassNames?.calendarNotes?.label)}
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames(
              "border-subtle rounded-lg border py-6 px-4 sm:px-6",
              customClassNames?.calendarNotes?.container
            )}
            descriptionClassName={customClassNames?.calendarNotes?.description}
            data-testid="disable-notes"
            title={t("disable_notes")}
            {...hideCalendarNotesLocked}
            description={
              <LearnMoreLink
                t={t}
                i18nKey="disable_notes_description"
                href="https://cal.com/help/event-types/hide-notes"
              />
            }
            checked={value}
            onCheckedChange={(e) => onChange(e)}
          />
        )}
      />

      <Controller
        name="hideCalendarEventDetails"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName={classNames("text-sm", customClassNames?.eventDetailsVisibility?.label)}
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames(
              "border-subtle rounded-lg border py-6 px-4 sm:px-6",
              customClassNames?.eventDetailsVisibility?.container
            )}
            descriptionClassName={customClassNames?.eventDetailsVisibility?.description}
            title={t("hide_calendar_event_details")}
            {...hideCalendarEventDetailsLocked}
            description={t("description_hide_calendar_event_details")}
            checked={value}
            onCheckedChange={(e) => onChange(e)}
          />
        )}
      />

      <Controller
        name="hideOrganizerEmail"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName={classNames("text-sm", customClassNames?.hideOrganizerEmail?.label)}
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames(
              "border-subtle rounded-lg border py-6 px-4 sm:px-6",
              customClassNames?.hideOrganizerEmail?.container
            )}
            title={t("hide_organizer_email")}
            {...hideOrganizerEmailLocked}
            description={
              <LearnMoreLink
                t={t}
                i18nKey="hide_organizer_email_description"
                href="https://cal.com/help/event-types/hideorganizersemail#hide-organizers-email"
              />
            }
            descriptionClassName={customClassNames?.hideOrganizerEmail?.description}
            checked={value}
            onCheckedChange={(e) => onChange(e)}
            data-testid="hide-organizer-email"
          />
        )}
      />

      {!isPlatform && (
        <Controller
          name="multiplePrivateLinks"
          render={() => {
            return (
              <SettingsToggle
                labelClassName="text-sm"
                toggleSwitchAtTheEnd={true}
                switchContainerClassName={classNames(
                  "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                  multiplePrivateLinksVisible && "rounded-b-none"
                )}
                childrenClassName="lg:ml-0"
                data-testid="multiplePrivateLinksCheck"
                title={t("multiple_private_links_title")}
                {...multiplePrivateLinksLocked}
                description={
                  <LearnMoreLink
                    t={t}
                    i18nKey="multiple_private_links_description"
                    href="https://cal.com/help/event-types/private-links"
                  />
                }
                tooltip={isManagedEventType ? t("managed_event_field_parent_control_disabled") : ""}
                checked={multiplePrivateLinksVisible}
                onCheckedChange={(e) => {
                  if (!e) {
                    formMethods.setValue("multiplePrivateLinks", [], { shouldDirty: true });
                  } else {
                    formMethods.setValue(
                      "multiplePrivateLinks",
                      [generateHashedLink(formMethods.getValues("users")[0]?.id ?? team?.id)],
                      { shouldDirty: true }
                    );
                  }
                  setMultiplePrivateLinksVisible(e);
                }}>
                {!isManagedEventType && (
                  <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                    <MultiplePrivateLinksController
                      team={team}
                      bookerUrl={eventType.bookerUrl}
                      setMultiplePrivateLinksVisible={setMultiplePrivateLinksVisible}
                      userTimeZone={userTimeZone}
                    />
                  </div>
                )}
              </SettingsToggle>
            );
          }}
        />
      )}

      <Controller
        name="lockTimeZoneToggleOnBookingPage"
        render={({ field: { value, onChange } }) => {
          const currentLockedTimeZone = formMethods.getValues("lockedTimeZone");
          const showSelector =
            value &&
            (!(eventType.lockTimeZoneToggleOnBookingPage && !eventType.lockedTimeZone) ||
              !!currentLockedTimeZone);

          return (
            <SettingsToggle
              labelClassName={classNames("text-sm", customClassNames?.timezoneLock?.label)}
              descriptionClassName={customClassNames?.timezoneLock?.description}
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                customClassNames?.timezoneLock?.container,
                showSelector && "rounded-b-none"
              )}
              title={t("lock_timezone_toggle_on_booking_page")}
              {...lockTimeZoneToggleOnBookingPageLocked}
              description={
                <LearnMoreLink
                  t={t}
                  i18nKey="description_lock_timezone_toggle_on_booking_page"
                  href="https://cal.com/help/event-types/timezone-lock"
                />
              }
              checked={value}
              onCheckedChange={(e) => {
                onChange(e);
                const lockedTimeZone = e ? (eventType.lockedTimeZone ?? "Europe/London") : null;
                formMethods.setValue("lockedTimeZone", lockedTimeZone, { shouldDirty: true });
              }}
              data-testid="lock-timezone-toggle"
              childrenClassName="lg:ml-0">
              {showSelector && (
                <div className="border-subtle flex flex-col gap-6 rounded-b-lg border border-t-0 p-6">
                  <div>
                    <Controller
                      name="lockedTimeZone"
                      control={formMethods.control}
                      render={({ field: { value } }) => (
                        <>
                          <Label className="text-default mb-2 block text-sm font-medium">
                            <>{t("timezone")}</>
                          </Label>
                          <TimezoneSelect
                            id="lockedTimeZone"
                            value={value ?? "Europe/London"}
                            onChange={(event) => {
                              if (event)
                                formMethods.setValue("lockedTimeZone", event.value, { shouldDirty: true });
                            }}
                          />
                        </>
                      )}
                    />
                  </div>
                </div>
              )}
            </SettingsToggle>
          );
        }}
      />

      <Controller
        name="allowReschedulingPastBookings"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName={classNames("text-sm")}
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames("border-subtle rounded-lg border py-6 px-4 sm:px-6")}
            title={t("allow_rescheduling_past_events")}
            {...reschedulingPastBookingsLocked}
            description={
              <LearnMoreLink
                t={t}
                i18nKey="allow_rescheduling_past_events_description"
                href="https://cal.com/help/event-types/allow-rescheduling"
              />
            }
            checked={value}
            onCheckedChange={(e) => onChange(e)}
          />
        )}
      />

      <Controller
        name="allowReschedulingCancelledBookings"
        render={({ field: { onChange } }) => (
          <SettingsToggle
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
            title={t("allow_rescheduling_cancelled_bookings")}
            data-testid="allow-rescheduling-cancelled-bookings-toggle"
            {...allowReschedulingCancelledBookingsLocked}
            description={t("description_allow_rescheduling_cancelled_bookings")}
            checked={allowReschedulingCancelledBookings}
            onCheckedChange={(val) => {
              setAllowReschedulingCancelledBookings(val);
              onChange(val);
            }}
          />
        )}
      />
    </div>
  );
};
