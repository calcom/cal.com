import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { Alert } from "@calcom/ui/components/alert";
import { InputField, Label, Select, Switch } from "@calcom/ui/components/form";
import { Section } from "@calcom/ui/components/section";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { SalesforceFieldType, SalesforceRecordEnum, WhenToWriteToRecord } from "../lib/enums";
import {
  type appDataSchema,
  isWriteToBookingEntry,
  type LastSyncError,
  type RRSkipFieldRule,
  type WriteToBookingEntry,
} from "../zod";
import FieldRulesSettings from "./components/FieldRulesSettings";
import WriteToObjectSettings, { BookingActionEnum } from "./components/WriteToObjectSettings";

const EMPTY_RECORD: Record<string, unknown> = {};

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({
  app,
  eventType,
  onAppInstallSuccess,
}) {
  const pathname = usePathname();

  const { getAppData, setAppData, disabled } = useAppContextWithSchema<typeof appDataSchema>();
  const { enabled, updateEnabled } = useIsAppEnabled(app);
  const isRoundRobinLeadSkipEnabled = getAppData("roundRobinLeadSkip");
  const roundRobinSkipCheckRecordOn =
    getAppData("roundRobinSkipCheckRecordOn") ?? SalesforceRecordEnum.CONTACT;
  const ifFreeEmailDomainSkipOwnerCheck = getAppData("ifFreeEmailDomainSkipOwnerCheck") ?? false;
  const isSkipContactCreationEnabled = getAppData("skipContactCreation");
  const createLeadIfAccountNull = getAppData("createLeadIfAccountNull");
  const createNewContactUnderAccount = getAppData("createNewContactUnderAccount");
  const createEventOn = getAppData("createEventOn") ?? SalesforceRecordEnum.CONTACT;
  const onBookingWriteToEventObject = getAppData("onBookingWriteToEventObject") ?? false;
  const onBookingWriteToEventObjectMap = getAppData("onBookingWriteToEventObjectMap") ?? EMPTY_RECORD;
  const createEventOnLeadCheckForContact = getAppData("createEventOnLeadCheckForContact") ?? false;
  const onBookingChangeRecordOwner = getAppData("onBookingChangeRecordOwner") ?? false;
  const onBookingChangeRecordOwnerName = getAppData("onBookingChangeRecordOwnerName") ?? [];
  const sendNoShowAttendeeData = getAppData("sendNoShowAttendeeData") ?? false;
  const sendNoShowAttendeeDataField = getAppData("sendNoShowAttendeeDataField") ?? "";
  const onBookingWriteToRecord = getAppData("onBookingWriteToRecord") ?? false;
  const onBookingWriteToRecordFields = getAppData("onBookingWriteToRecordFields") ?? {};
  const ignoreGuests = getAppData("ignoreGuests") ?? false;
  const roundRobinSkipFallbackToLeadOwner = getAppData("roundRobinSkipFallbackToLeadOwner") ?? false;
  const onCancelWriteToEventRecord = getAppData("onCancelWriteToEventRecord") ?? false;
  const onCancelWriteToEventRecordFields = getAppData("onCancelWriteToEventRecordFields") ?? {};
  const onCancelWriteToRecord = getAppData("onCancelWriteToRecord") ?? false;
  const onCancelWriteToRecordFields = getAppData("onCancelWriteToRecordFields") ?? {};
  const rrSkipFieldRules = (getAppData("rrSkipFieldRules") ?? []) as RRSkipFieldRule[];
  const excludeAccountRecordTypes = (getAppData("excludeAccountRecordTypes") ?? []) as string[];
  const [excludeRTInput, setExcludeRTInput] = useState(() => excludeAccountRecordTypes.join(", "));
  const lastSyncError = getAppData("lastSyncError") as LastSyncError | null | undefined;
  const enableFuzzyDomainMatching = getAppData("enableFuzzyDomainMatching") ?? false;

  const { t } = useLocale();

  const recordOptions = [
    { label: t("contact"), value: SalesforceRecordEnum.CONTACT },
    { label: t("salesforce_lead"), value: SalesforceRecordEnum.LEAD },
    { label: t("salesforce_contact_under_account"), value: SalesforceRecordEnum.ACCOUNT },
  ];
  const [createEventOnSelectedOption, setCreateEventOnSelectedOption] = useState(
    recordOptions.find((option) => option.value === createEventOn) ?? recordOptions[0]
  );

  const checkOwnerOptions = [
    { label: t("contact"), value: SalesforceRecordEnum.CONTACT },
    { label: t("salesforce_lead"), value: SalesforceRecordEnum.LEAD },
    { label: t("account"), value: SalesforceRecordEnum.ACCOUNT },
  ];
  const [checkOwnerSelectedOption, setCheckOwnerSelectedOption] = useState(
    checkOwnerOptions.find((option) => option.value === roundRobinSkipCheckRecordOn) ?? checkOwnerOptions[0]
  );

  const { normalizedEventObjectMap, hasLegacyEventFields } = useMemo(() => {
    const map = onBookingWriteToEventObjectMap as Record<string, unknown>;
    const result: Record<string, WriteToBookingEntry> = {};
    let legacyDetected = false;
    for (const [key, val] of Object.entries(map)) {
      if (isWriteToBookingEntry(val)) {
        result[key] = val;
      } else {
        legacyDetected = true;
        result[key] = {
          value: typeof val === "boolean" ? val : String(val ?? ""),
          fieldType: typeof val === "boolean" ? SalesforceFieldType.CHECKBOX : SalesforceFieldType.TEXT,
          whenToWrite: WhenToWriteToRecord.EVERY_BOOKING,
        };
      }
    }
    return { normalizedEventObjectMap: result, hasLegacyEventFields: legacyDetected };
  }, [onBookingWriteToEventObjectMap]);

  // Used when creating events under leads or contacts under account
  const CreateContactUnderAccount = () => {
    return (
      <Section.SubSection>
        <Section.SubSectionHeader
          icon="at-sign"
          title={t("salesforce_create_new_contact_under_account")}
          labelFor="create-new-contact-under-account">
          <Switch
            size="sm"
            labelOnLeading
            checked={createNewContactUnderAccount}
            onCheckedChange={(checked) => {
              setAppData("createNewContactUnderAccount", checked);
            }}
          />
        </Section.SubSectionHeader>
      </Section.SubSection>
    );
  };

  return (
    <AppCard
      onAppInstallSuccess={onAppInstallSuccess}
      returnTo={`${WEBAPP_URL}${pathname}?tabName=apps`}
      app={app}
      teamId={eventType.team?.id || undefined}
      switchOnClick={(e) => {
        updateEnabled(e);
      }}
      switchChecked={enabled}
      hideSettingsIcon>
      <Section.Content>
        {lastSyncError && (
          <Alert
            severity="error"
            className="mb-4"
            title={t("salesforce_sync_failure", { errorCode: lastSyncError.errorCode })}
            message={`${lastSyncError.errorMessage}${
              lastSyncError.droppedFields?.length
                ? ` (${t("salesforce_dropped_fields")}: ${lastSyncError.droppedFields.join(", ")})`
                : ""
            } — ${new Date(lastSyncError.timestamp).toLocaleString()}`}
            actions={
              <div className="mt-1">
                <button
                  type="button"
                  className="text-sm font-medium underline"
                  onClick={() => setAppData("lastSyncError", null)}>
                  {t("dismiss")}
                </button>
              </div>
            }
          />
        )}
        <Section.SubSection>
          <Section.SubSectionHeader
            icon="zap"
            title={t("salesforce_add_attendees_as")}
            justify="start"
            labelFor="add-attendees-as">
            <Select
              size="sm"
              id="add-attendees-as"
              className="w-[200px]"
              options={recordOptions}
              value={createEventOnSelectedOption}
              onChange={(e) => {
                if (e) {
                  setCreateEventOnSelectedOption(e);
                  setAppData("createEventOn", e.value);
                }
              }}
            />
          </Section.SubSectionHeader>
        </Section.SubSection>

        <Section.SubSection>
          <Section.SubSectionHeader
            icon="user-plus"
            title={t("salesforce_ignore_guests")}
            labelFor="ignore-guests">
            <Switch
              size="sm"
              labelOnLeading
              checked={ignoreGuests}
              onCheckedChange={(checked) => {
                setAppData("ignoreGuests", checked);
              }}
            />
          </Section.SubSectionHeader>
        </Section.SubSection>

        {createEventOnSelectedOption.value === SalesforceRecordEnum.CONTACT ? (
          <Section.SubSection>
            <Section.SubSectionHeader
              icon="user-plus"
              title={t("skip_contact_creation", { appName: "Salesforce" })}
              labelFor="skip-contact-creation">
              <Switch
                size="sm"
                labelOnLeading
                checked={isSkipContactCreationEnabled}
                onCheckedChange={(checked) => {
                  setAppData("skipContactCreation", checked);
                }}
              />
            </Section.SubSectionHeader>
          </Section.SubSection>
        ) : null}

        {createEventOnSelectedOption.value === SalesforceRecordEnum.LEAD ? (
          <>
            <Section.SubSection>
              <Section.SubSectionHeader
                icon="user-plus"
                title={t("salesforce_create_event_on_contact")}
                labelFor="create-event-on-contact">
                <Switch
                  size="sm"
                  labelOnLeading
                  checked={createEventOnLeadCheckForContact}
                  onCheckedChange={(checked) => {
                    setAppData("createEventOnLeadCheckForContact", checked);
                  }}
                />
              </Section.SubSectionHeader>
            </Section.SubSection>
            <CreateContactUnderAccount />
          </>
        ) : null}
        {createEventOnSelectedOption.value === SalesforceRecordEnum.ACCOUNT ? (
          <>
            <CreateContactUnderAccount />
            <Section.SubSection>
              <Section.SubSectionHeader
                icon="user-plus"
                title={t("salesforce_if_account_does_not_exist")}
                labelFor="create-lead-if-account-null">
                <Switch
                  size="sm"
                  labelOnLeading
                  checked={createLeadIfAccountNull}
                  onCheckedChange={(checked) => {
                    setAppData("createLeadIfAccountNull", checked);
                  }}
                />
              </Section.SubSectionHeader>
            </Section.SubSection>
          </>
        ) : null}

        {(createEventOnSelectedOption.value === SalesforceRecordEnum.ACCOUNT ||
          createEventOnSelectedOption.value === SalesforceRecordEnum.LEAD) && (
          <Section.SubSection>
            <Section.SubSectionHeader
              icon="search"
              title={t("salesforce_enable_fuzzy_domain_matching")}
              labelFor="enable-fuzzy-domain-matching">
              <Switch
                size="sm"
                id="enable-fuzzy-domain-matching"
                labelOnLeading
                checked={enableFuzzyDomainMatching}
                onCheckedChange={(checked) => {
                  setAppData("enableFuzzyDomainMatching", checked);
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
            optionSwitchOnChange={(checked) => {
              setAppData("onBookingWriteToEventObject", checked);
            }}
            writeToObjectData={normalizedEventObjectMap}
            updateWriteToObjectData={(data) => setAppData("onBookingWriteToEventObjectMap", data)}
            hideWhenToWrite
          />
          {onBookingWriteToEventObject && hasLegacyEventFields && (
            <Alert
              severity="warning"
              className="mt-2"
              message={t("salesforce_legacy_event_fields_warning")}
            />
          )}
        </Section.SubSection>

        <Section.SubSection>
          <WriteToObjectSettings
            bookingAction={BookingActionEnum.ON_BOOKING}
            optionLabel={t("salesforce_on_booking_write_to_record", { record: createEventOn })}
            optionEnabled={onBookingWriteToRecord}
            writeToObjectData={onBookingWriteToRecordFields}
            optionSwitchOnChange={(checked) => {
              setAppData("onBookingWriteToRecord", checked);
            }}
            updateWriteToObjectData={(data) => setAppData("onBookingWriteToRecordFields", data)}
          />
        </Section.SubSection>

        <Section.SubSection>
          <Section.SubSectionHeader
            icon="user-plus"
            title={t("salesforce_change_record_owner_on_booking")}
            labelFor="change-record-owner-on-booking">
            <Switch
              size="sm"
              labelOnLeading
              checked={onBookingChangeRecordOwner}
              onCheckedChange={(checked) => {
                setAppData("onBookingChangeRecordOwner", checked);
              }}
            />
          </Section.SubSectionHeader>
          {onBookingChangeRecordOwner ? (
            <Section.SubSectionContent classNames={{ container: "p-3" }}>
              <div>
                <Label
                  htmlFor="on-booking-change-record-owner-name"
                  className="text-subtle text-sm font-medium">
                  {t("salesforce_owner_name_to_change")}
                </Label>
                <InputField
                  id="on-booking-change-record-owner-name"
                  size="sm"
                  value={onBookingChangeRecordOwnerName}
                  onChange={(e) => setAppData("onBookingChangeRecordOwnerName", e.target.value)}
                />
              </div>
            </Section.SubSectionContent>
          ) : null}
        </Section.SubSection>

        <Section.SubSection>
          <Section.SubSectionHeader
            icon="filter"
            title={t("salesforce_exclude_record_types")}
            justify="start">
            {null}
          </Section.SubSectionHeader>
          <Section.SubSectionContent classNames={{ container: "p-3" }}>
            <div>
              <Label
                htmlFor="exclude-account-record-types"
                className="text-subtle text-sm font-medium">
                {t("salesforce_exclude_record_types_description")}
              </Label>
              <InputField
                id="exclude-account-record-types"
                size="sm"
                placeholder="Partner/Alliance, Vendor"
                value={excludeRTInput}
                onChange={(e) => setExcludeRTInput(e.target.value)}
                onBlur={() => {
                  const values = excludeRTInput
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean);
                  setAppData("excludeAccountRecordTypes", values);
                  setExcludeRTInput(values.join(", "));
                }}
              />
            </div>
          </Section.SubSectionContent>
        </Section.SubSection>

        {eventType.schedulingType === SchedulingType.ROUND_ROBIN ? (
          <>
            <Section.SubSection>
              <Section.SubSectionHeader
                icon="users"
                title={t("salesforce_book_directly_with_attendee_owner")}
                labelFor="book-directly-with-attendee-owner">
                <Switch
                  size="sm"
                  id="book-directly-witha-attendee-owner"
                  checked={isRoundRobinLeadSkipEnabled}
                  onCheckedChange={(checked) => {
                    setAppData("roundRobinLeadSkip", checked);
                    if (checked) {
                      // temporary solution, enabled should always be already set
                      setAppData("enabled", checked);
                    }
                  }}
                />
              </Section.SubSectionHeader>
              {isRoundRobinLeadSkipEnabled ? (
                <Section.SubSectionContent classNames={{ container: "p-3" }}>
                  <div>
                    <Label
                      htmlFor="round-robin-skip-check-record-on"
                      className="text-subtle text-sm font-medium">
                      {t("salesforce_check_owner_of")}
                    </Label>
                    <Select
                      size="sm"
                      className="w-60"
                      options={checkOwnerOptions}
                      value={checkOwnerSelectedOption}
                      onChange={(e) => {
                        if (e) {
                          setCheckOwnerSelectedOption(e);
                          setAppData("roundRobinSkipCheckRecordOn", e.value);
                        }
                      }}
                    />
                  </div>
                </Section.SubSectionContent>
              ) : null}
            </Section.SubSection>
            <>
              {isRoundRobinLeadSkipEnabled ? (
                <>
                  {checkOwnerSelectedOption.value === SalesforceRecordEnum.CONTACT ? (
                    <Section.SubSection>
                      <Section.SubSectionHeader
                        icon="users"
                        title={t("salesforce_round_robin_skip_fallback_to_lead_owner")}
                        labelFor="round-robin-skip-fallback-to-lead-owner">
                        <Switch
                          id="round-robin-skip-fallback-to-lead-owner"
                          size="sm"
                          checked={roundRobinSkipFallbackToLeadOwner}
                          onCheckedChange={(checked) => {
                            setAppData("roundRobinSkipFallbackToLeadOwner", checked);
                          }}
                        />
                      </Section.SubSectionHeader>
                    </Section.SubSection>
                  ) : null}
                  <Section.SubSection>
                    <Section.SubSectionHeader
                      icon="users"
                      title={t("salesforce_if_free_email_domain_skip_owner_check")}
                      labelFor="if-free-email-domain-skip-owner-check">
                      <Switch
                        id="if-free-email-domain-skip-owner-check"
                        size="sm"
                        checked={ifFreeEmailDomainSkipOwnerCheck}
                        onCheckedChange={(checked) => {
                          setAppData("ifFreeEmailDomainSkipOwnerCheck", checked);
                        }}
                      />
                    </Section.SubSectionHeader>
                    <Alert severity="info" title={t("skip_rr_description")} />
                  </Section.SubSection>
                  <FieldRulesSettings
                    fieldRules={rrSkipFieldRules}
                    updateFieldRules={(rules) => setAppData("rrSkipFieldRules", rules)}
                  />
                </>
              ) : null}
            </>
          </>
        ) : null}

        <Section.SubSection>
          <WriteToObjectSettings
            bookingAction={BookingActionEnum.ON_CANCEL}
            optionLabel={t("salesforce_on_cancel_write_to_event")}
            optionEnabled={onCancelWriteToEventRecord}
            writeToObjectData={onCancelWriteToEventRecordFields}
            optionSwitchOnChange={(checked) => {
              setAppData("onCancelWriteToEventRecord", checked);
            }}
            updateWriteToObjectData={(data) => setAppData("onCancelWriteToEventRecordFields", data)}
          />
        </Section.SubSection>

        <Section.SubSection>
          <WriteToObjectSettings
            bookingAction={BookingActionEnum.ON_CANCEL}
            optionLabel={t("salesforce_on_cancel_write_to_record", { record: createEventOn })}
            optionEnabled={onCancelWriteToRecord}
            writeToObjectData={onCancelWriteToRecordFields}
            optionSwitchOnChange={(checked) => {
              setAppData("onCancelWriteToRecord", checked);
            }}
            updateWriteToObjectData={(data) => setAppData("onCancelWriteToRecordFields", data)}
          />
        </Section.SubSection>

        <Section.SubSection>
          <Section.SubSectionHeader
            icon="calendar"
            title="Send no show attendee data to event object"
            labelFor="send-no-show-attendee-data">
            <Switch
              id="send-no-show-attendee-data"
              size="sm"
              checked={sendNoShowAttendeeData}
              onCheckedChange={(checked) => {
                setAppData("sendNoShowAttendeeData", checked);
              }}
            />
          </Section.SubSectionHeader>
          {sendNoShowAttendeeData ? (
            <Section.SubSectionContent classNames={{ container: "p-3" }}>
              <Label
                htmlFor="send-no-show-attendee-data-field-name"
                className="text-subtle text-sm font-medium">
                Field name to check (must be checkbox data type)
              </Label>
              <InputField
                id="send-no-show-attendee-data-field-name"
                size="sm"
                value={sendNoShowAttendeeDataField}
                onChange={(e) => setAppData("sendNoShowAttendeeDataField", e.target.value)}
              />
            </Section.SubSectionContent>
          ) : null}
        </Section.SubSection>
      </Section.Content>
    </AppCard>
  );
};

export default EventTypeAppCard;
