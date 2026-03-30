import AppCard from "@calcom/app-store/_components/AppCard";
import WriteToObjectSettings, {
  BookingActionEnum,
} from "@calcom/app-store/_components/crm/WriteToObjectSettings";
import { CrmFieldType } from "@calcom/app-store/_lib/crm-enums";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { Alert } from "@calcom/ui/components/alert";
import { Switch } from "@calcom/ui/components/form";
import { Section } from "@calcom/ui/components/section";
import { usePathname } from "next/navigation";
import type { appDataSchema } from "../zod";
import { WhenToWrite } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({
  app,
  eventType,
  onAppInstallSuccess,
}) {
  const pathname = usePathname();
  const { t } = useLocale();
  const { getAppData, setAppData } = useAppContextWithSchema<typeof appDataSchema>();
  const { enabled, updateEnabled } = useIsAppEnabled(app);

  const ignoreGuests = getAppData("ignoreGuests") ?? false;
  const skipContactCreation = getAppData("skipContactCreation") ?? false;
  const setOrganizerAsOwner = getAppData("setOrganizerAsOwner") ?? false;
  const overwriteContactOwner = getAppData("overwriteContactOwner") ?? false;
  const onBookingWriteToEventObject = getAppData("onBookingWriteToEventObject") ?? false;
  const onBookingWriteToEventObjectFields = getAppData("onBookingWriteToEventObjectFields") ?? {};
  const roundRobinLeadSkip = getAppData("roundRobinLeadSkip") ?? false;
  const ifFreeEmailDomainSkipOwnerCheck = getAppData("ifFreeEmailDomainSkipOwnerCheck") ?? false;

  return (
    <AppCard
      onAppInstallSuccess={onAppInstallSuccess}
      returnTo={`${WEBAPP_URL}${pathname}?tabName=apps`}
      app={app}
      teamId={eventType.team?.id || undefined}
      switchOnClick={(e: boolean): void => {
        updateEnabled(e);
      }}
      switchChecked={enabled}
      hideSettingsIcon>
      <Section.Content>
        <Section.SubSection>
          <Section.SubSectionHeader
            icon="user-plus"
            title={t("hubspot_ignore_guests")}
            labelFor="ignore-guests">
            <Switch
              size="sm"
              labelOnLeading
              checked={ignoreGuests}
              onCheckedChange={(checked: boolean): void => {
                setAppData("ignoreGuests", checked);
              }}
            />
          </Section.SubSectionHeader>
        </Section.SubSection>
        <Section.SubSection>
          <Section.SubSectionHeader
            icon="user-plus"
            title={t("skip_contact_creation", { appName: "HubSpot" })}
            labelFor="skip-contact-creation">
            <Switch
              size="sm"
              labelOnLeading
              checked={skipContactCreation}
              onCheckedChange={(checked: boolean): void => {
                setAppData("skipContactCreation", checked);
              }}
            />
          </Section.SubSectionHeader>
        </Section.SubSection>
        <Section.SubSection>
          <Section.SubSectionHeader
            icon="user-check"
            title={t("set_organizer_as_contact_owner")}
            labelFor="set-organizer-as-owner">
            <Switch
              size="sm"
              labelOnLeading
              checked={setOrganizerAsOwner}
              onCheckedChange={(checked: boolean): void => {
                setAppData("setOrganizerAsOwner", checked);
                if (!checked) {
                  setAppData("overwriteContactOwner", false);
                }
              }}
            />
          </Section.SubSectionHeader>
        </Section.SubSection>
        {setOrganizerAsOwner && (
          <Section.SubSection>
            <Section.SubSectionHeader
              icon="refresh-cw"
              title={t("overwrite_existing_contact_owner")}
              labelFor="overwrite-contact-owner">
              <Switch
                size="sm"
                labelOnLeading
                checked={overwriteContactOwner}
                onCheckedChange={(checked: boolean): void => {
                  setAppData("overwriteContactOwner", checked);
                }}
              />
            </Section.SubSectionHeader>
          </Section.SubSection>
        )}

        <Section.SubSection>
          <WriteToObjectSettings
            bookingAction={BookingActionEnum.ON_BOOKING}
            optionLabel={t("on_booking_write_to_event_object")}
            optionEnabled={onBookingWriteToEventObject}
            writeToObjectData={onBookingWriteToEventObjectFields}
            optionSwitchOnChange={(checked: boolean): void => {
              setAppData("onBookingWriteToEventObject", checked);
            }}
            updateWriteToObjectData={(data): void => setAppData("onBookingWriteToEventObjectFields", data)}
            supportedFieldTypes={[
              CrmFieldType.TEXT,
              CrmFieldType.DATE,
              CrmFieldType.PHONE,
              CrmFieldType.CHECKBOX,
              CrmFieldType.CUSTOM,
            ]}
            supportedWriteTriggers={[WhenToWrite.EVERY_BOOKING]}
          />
        </Section.SubSection>

        {eventType.schedulingType === SchedulingType.ROUND_ROBIN ? (
          <>
            <Section.SubSection>
              <Section.SubSectionHeader
                icon="users"
                title={t("crm_book_directly_with_attendee_owner", { appName: app.name })}
                labelFor="book-directly-with-attendee-owner">
                <Switch
                  size="sm"
                  id="book-directly-with-attendee-owner"
                  checked={roundRobinLeadSkip}
                  onCheckedChange={(checked) => {
                    setAppData("roundRobinLeadSkip", checked);
                    if (checked) {
                      setAppData("enabled", checked);
                    }
                  }}
                />
              </Section.SubSectionHeader>
            </Section.SubSection>
            {roundRobinLeadSkip && (
              <Section.SubSection>
                <Section.SubSectionHeader
                  icon="users"
                  title={t("crm_if_free_email_domain_skip_owner_check")}
                  labelFor="if-free-email-domain-skip-owner-check">
                  <Switch
                    size="sm"
                    id="if-free-email-domain-skip-owner-check"
                    checked={ifFreeEmailDomainSkipOwnerCheck}
                    onCheckedChange={(checked) => {
                      setAppData("ifFreeEmailDomainSkipOwnerCheck", checked);
                    }}
                  />
                </Section.SubSectionHeader>
                <Alert severity="info" title={t("skip_rr_description")} />
              </Section.SubSection>
            )}
          </>
        ) : null}
      </Section.Content>
    </AppCard>
  );
};

export default EventTypeAppCard;
