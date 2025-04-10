import { usePathname } from "next/navigation";
import { useState } from "react";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { InputField } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { Switch } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import { SalesforceRecordEnum } from "../lib/enums";
import type { appDataSchema } from "../zod";
import WriteToObjectSettings, { BookingActionEnum } from "./components/WriteToObjectSettings";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType }) {
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
  const onBookingWriteToEventObjectMap = getAppData("onBookingWriteToEventObjectMap") ?? {};
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

  const [newOnBookingWriteToEventObjectField, setNewOnBookingWriteToEventObjectField] = useState({
    field: "",
    value: "",
  });

  // Used when creating events under leads or contacts under account
  const CreateContactUnderAccount = () => {
    return (
      <Switch
        label={t("salesforce_create_new_contact_under_account")}
        labelOnLeading
        checked={createNewContactUnderAccount}
        onCheckedChange={(checked) => {
          setAppData("createNewContactUnderAccount", checked);
        }}
      />
    );
  };

  return (
    <AppCard
      returnTo={`${WEBAPP_URL}${pathname}?tabName=apps`}
      app={app}
      teamId={eventType.team?.id || undefined}
      switchOnClick={(e) => {
        updateEnabled(e);
      }}
      switchChecked={enabled}
      hideSettingsIcon>
      <>
        <div className="mb-4 ml-2">
          <label className="text-emphasis mb-2 align-text-top text-sm font-medium">
            {t("salesforce_create_record_as")}
          </label>
          <Select
            className="mt-2 w-60"
            options={recordOptions}
            value={createEventOnSelectedOption}
            onChange={(e) => {
              if (e) {
                setCreateEventOnSelectedOption(e);
                setAppData("createEventOn", e.value);
              }
            }}
          />
        </div>
        <div className="mb-4">
          <Switch
            label={t("salesforce_ignore_guests")}
            labelOnLeading
            checked={ignoreGuests}
            onCheckedChange={(checked) => {
              setAppData("ignoreGuests", checked);
            }}
          />
        </div>
        {createEventOnSelectedOption.value === SalesforceRecordEnum.CONTACT ? (
          <div>
            <Switch
              label={t("skip_contact_creation", { appName: "Salesforce" })}
              labelOnLeading
              checked={isSkipContactCreationEnabled}
              onCheckedChange={(checked) => {
                setAppData("skipContactCreation", checked);
              }}
            />
          </div>
        ) : null}
        {createEventOnSelectedOption.value === SalesforceRecordEnum.LEAD ? (
          <div>
            <Switch
              label={t("salesforce_create_event_on_contact")}
              labelOnLeading
              checked={createEventOnLeadCheckForContact}
              onCheckedChange={(checked) => {
                setAppData("createEventOnLeadCheckForContact", checked);
              }}
            />
            <div className="mt-4">
              <CreateContactUnderAccount />
            </div>
          </div>
        ) : null}
        {createEventOnSelectedOption.value === SalesforceRecordEnum.ACCOUNT ? (
          <>
            <div className="mb-4">
              <CreateContactUnderAccount />
            </div>
            <div>
              <Switch
                label={t("salesforce_if_account_does_not_exist")}
                labelOnLeading
                checked={createLeadIfAccountNull}
                onCheckedChange={(checked) => {
                  setAppData("createLeadIfAccountNull", checked);
                }}
              />
            </div>
          </>
        ) : null}

        <div className="mt-4">
          <Switch
            label={t("on_booking_write_to_event_object")}
            labelOnLeading
            checked={onBookingWriteToEventObject}
            onCheckedChange={(checked) => {
              setAppData("onBookingWriteToEventObject", checked);
            }}
          />
          {onBookingWriteToEventObject ? (
            <div className="ml-2 mt-2">
              <div className="grid grid-cols-3 gap-4">
                <div>{t("field_name")}</div>
                <div>{t("value")}</div>
              </div>
              <div>
                {Object.keys(onBookingWriteToEventObjectMap).map((key) => (
                  <div className="mt-2 grid grid-cols-3 gap-4" key={key}>
                    <div>
                      <InputField value={key} readOnly />
                    </div>
                    <div>
                      <InputField value={onBookingWriteToEventObjectMap[key]} readOnly />
                    </div>
                    <div>
                      <Button
                        StartIcon="trash"
                        variant="icon"
                        color="destructive"
                        onClick={() => {
                          const newObject = onBookingWriteToEventObjectMap;
                          delete onBookingWriteToEventObjectMap[key];
                          setAppData("onBookingWriteToEventObjectMap", newObject);
                        }}
                      />
                    </div>
                  </div>
                ))}
                <div className="mt-2 grid grid-cols-3 gap-4">
                  <div>
                    <InputField
                      value={newOnBookingWriteToEventObjectField.field}
                      onChange={(e) =>
                        setNewOnBookingWriteToEventObjectField({
                          ...newOnBookingWriteToEventObjectField,
                          field: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <InputField
                      value={newOnBookingWriteToEventObjectField.value}
                      onChange={(e) =>
                        setNewOnBookingWriteToEventObjectField({
                          ...newOnBookingWriteToEventObjectField,
                          value: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
              <Button
                className="mt-2"
                size="sm"
                disabled={
                  !(newOnBookingWriteToEventObjectField.field && newOnBookingWriteToEventObjectField.value)
                }
                onClick={() => {
                  if (
                    Object.keys(onBookingWriteToEventObjectMap).includes(
                      newOnBookingWriteToEventObjectField.field.trim()
                    )
                  ) {
                    showToast("Field already exists", "error");
                    return;
                  }

                  setAppData("onBookingWriteToEventObjectMap", {
                    ...onBookingWriteToEventObjectMap,
                    [newOnBookingWriteToEventObjectField.field.trim()]:
                      newOnBookingWriteToEventObjectField.value.trim(),
                  });
                  setNewOnBookingWriteToEventObjectField({ field: "", value: "" });
                }}>
                {t("add_new_field")}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mt-4">
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
        </div>

        <div className="mt-4">
          <Switch
            label="Change record owner on booking"
            labelOnLeading
            checked={onBookingChangeRecordOwner}
            onCheckedChange={(checked) => {
              setAppData("onBookingChangeRecordOwner", checked);
            }}
          />
        </div>
        {onBookingChangeRecordOwner ? (
          <div className="ml-2 mt-2">
            <p className="mb-2">{t("salesforce_owner_name_to_change")}</p>
            <InputField
              value={onBookingChangeRecordOwnerName}
              onChange={(e) => setAppData("onBookingChangeRecordOwnerName", e.target.value)}
            />
          </div>
        ) : null}

        {eventType.schedulingType === SchedulingType.ROUND_ROBIN ? (
          <div className="mt-4">
            <Switch
              label={t("salesforce_book_directly_with_attendee_owner")}
              labelOnLeading
              checked={isRoundRobinLeadSkipEnabled}
              onCheckedChange={(checked) => {
                setAppData("roundRobinLeadSkip", checked);
                if (checked) {
                  // temporary solution, enabled should always be already set
                  setAppData("enabled", checked);
                }
              }}
            />
            {isRoundRobinLeadSkipEnabled ? (
              <>
                <div className="my-4 ml-2">
                  <label className="text-emphasis mb-2 align-text-top text-sm font-medium">
                    {t("salesforce_check_owner_of")}
                  </label>
                  <Select
                    className="mt-2 w-60"
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
                {checkOwnerSelectedOption.value === SalesforceRecordEnum.CONTACT ? (
                  <div className="my-4">
                    <Switch
                      label={t("salesforce_round_robin_skip_fallback_to_lead_owner")}
                      labelOnLeading
                      checked={roundRobinSkipFallbackToLeadOwner}
                      onCheckedChange={(checked) => {
                        setAppData("roundRobinSkipFallbackToLeadOwner", checked);
                      }}
                    />
                  </div>
                ) : null}
                <div className="my-4">
                  <Switch
                    label={t("salesforce_if_free_email_domain_skip_owner_check")}
                    labelOnLeading
                    checked={ifFreeEmailDomainSkipOwnerCheck}
                    onCheckedChange={(checked) => {
                      setAppData("ifFreeEmailDomainSkipOwnerCheck", checked);
                    }}
                  />
                </div>
              </>
            ) : null}
            <Alert className="mt-2" severity="neutral" title={t("skip_rr_description")} />
          </div>
        ) : null}

        <div className="mt-4">
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
        </div>

        <div className="ml-2 mt-4">
          <Switch
            label="Send no show attendee data to event object"
            checked={sendNoShowAttendeeData}
            onCheckedChange={(checked) => {
              setAppData("sendNoShowAttendeeData", checked);
            }}
          />
          {sendNoShowAttendeeData ? (
            <div className="mt-2">
              <p className="mb-2">Field name to check (must be checkbox data type)</p>
              <InputField
                value={sendNoShowAttendeeDataField}
                onChange={(e) => setAppData("sendNoShowAttendeeDataField", e.target.value)}
              />
            </div>
          ) : null}
        </div>
      </>
    </AppCard>
  );
};

export default EventTypeAppCard;
