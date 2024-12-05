import { usePathname } from "next/navigation";
import { useState } from "react";

import { useAppContextWithSchema } from "@calcom/app-store/EventTypeAppContext";
import AppCard from "@calcom/app-store/_components/AppCard";
import useIsAppEnabled from "@calcom/app-store/_utils/useIsAppEnabled";
import type { EventTypeAppCardComponent } from "@calcom/app-store/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { Switch, Alert, Select, Button, InputField, showToast } from "@calcom/ui";

import {
  SalesforceRecordEnum,
  WhenToWriteToRecord,
  SalesforceFieldType,
  DateFieldTypeData,
} from "../lib/enums";
import type { appDataSchema } from "../zod";

const EventTypeAppCard: EventTypeAppCardComponent = function EventTypeAppCard({ app, eventType }) {
  const pathname = usePathname();

  const { getAppData, setAppData, disabled } = useAppContextWithSchema<typeof appDataSchema>();
  const { enabled, updateEnabled } = useIsAppEnabled(app);
  const isRoundRobinLeadSkipEnabled = getAppData("roundRobinLeadSkip");
  const roundRobinSkipCheckRecordOn =
    getAppData("roundRobinSkipCheckRecordOn") ?? SalesforceRecordEnum.CONTACT;
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

  const { t } = useLocale();

  const recordOptions = [
    { label: t("contact"), value: SalesforceRecordEnum.CONTACT },
    { label: t("salesforce_lead"), value: SalesforceRecordEnum.LEAD },
    { label: t("salesforce_contact_under_account"), value: SalesforceRecordEnum.ACCOUNT },
  ];
  const [createEventOnSelectedOption, setCreateEventOnSelectedOption] = useState(
    recordOptions.find((option) => option.value === createEventOn) ?? recordOptions[0]
  );

  const fieldTypeOptions = [
    { label: t("text"), value: SalesforceFieldType.TEXT },
    { label: t("date"), value: SalesforceFieldType.DATE },
    { label: t("phone").charAt(0).toUpperCase() + t("phone").slice(1), value: SalesforceFieldType.PHONE },
  ];

  const [writeToPersonObjectFieldType, setWriteToPersonObjectFieldType] = useState(fieldTypeOptions[0]);

  const whenToWriteToRecordOptions = [
    { label: t("on_every_booking"), value: WhenToWriteToRecord.EVERY_BOOKING },
    { label: t("only_if_field_is_empty"), value: WhenToWriteToRecord.FIELD_EMPTY },
  ];

  const [whenToWriteToPersonRecord, setWhenToWriteToPersonRecord] = useState(whenToWriteToRecordOptions[0]);

  const dateFieldValueOptions = [
    { label: t("booking_start_date"), value: DateFieldTypeData.BOOKING_START_DATE },
    { label: t("booking_created_date"), value: DateFieldTypeData.BOOKING_CREATED_DATE },
  ];

  const [dateFieldValue, setDateValue] = useState(dateFieldValueOptions[0]);

  const [newOnBookingWriteToPersonObjectField, setNewOnBookingWriteToPersonObjectField] = useState({
    field: "",
    fieldType: writeToPersonObjectFieldType.value,
    value: "",
    whenToWrite: WhenToWriteToRecord.FIELD_EMPTY,
  });

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
                {...Object.keys(onBookingWriteToEventObjectMap).map((key) => (
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
          <Switch
            label={t("salesforce_on_booking_write_to_record", { record: createEventOn })}
            labelOnLeading
            checked={onBookingWriteToRecord}
            onCheckedChange={(checked) => {
              setAppData("onBookingWriteToRecord", checked);
            }}
          />
          {onBookingWriteToRecord ? (
            <div className="ml-2 mt-2">
              <div className="grid grid-cols-5 gap-4">
                <div>{t("field_name")}</div>
                <div>{t("field_type")}</div>
                <div>{t("value")}</div>
                <div>{t("when_to_write")}</div>
              </div>
              <div>
                {...Object.keys(onBookingWriteToRecordFields).map((key) => (
                  <div className="mt-2 grid grid-cols-5 gap-4" key={key}>
                    <div>
                      <InputField value={key} readOnly />
                    </div>
                    <div>
                      <Select
                        value={fieldTypeOptions.find(
                          (option) => option.value === onBookingWriteToRecordFields[key].fieldType
                        )}
                        isDisabled={true}
                      />
                    </div>
                    <div>
                      {onBookingWriteToRecordFields[key].fieldType === SalesforceFieldType.DATE ? (
                        <Select
                          value={dateFieldValueOptions.find(
                            (option) => option.value === onBookingWriteToRecordFields[key].value
                          )}
                          isDisabled={true}
                        />
                      ) : (
                        <InputField value={onBookingWriteToRecordFields[key].value} readOnly />
                      )}
                    </div>
                    <div>
                      <Select
                        value={whenToWriteToRecordOptions.find(
                          (option) => option.value === onBookingWriteToRecordFields[key].whenToWrite
                        )}
                        isDisabled={true}
                      />
                    </div>
                    <div>
                      <Button
                        StartIcon="trash"
                        variant="icon"
                        color="destructive"
                        onClick={() => {
                          const newObject = onBookingWriteToRecordFields;
                          delete onBookingWriteToRecordFields[key];
                          setAppData("onBookingWriteToRecordFields", newObject);
                        }}
                      />
                    </div>
                  </div>
                ))}
                <div className="mt-2 grid grid-cols-5 gap-4">
                  <div>
                    <InputField
                      value={newOnBookingWriteToPersonObjectField.field}
                      onChange={(e) =>
                        setNewOnBookingWriteToPersonObjectField({
                          ...newOnBookingWriteToPersonObjectField,
                          field: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Select
                      options={fieldTypeOptions}
                      value={writeToPersonObjectFieldType}
                      onChange={(e) => {
                        if (e) {
                          setWriteToPersonObjectFieldType(e);
                          setNewOnBookingWriteToPersonObjectField({
                            ...newOnBookingWriteToPersonObjectField,
                            fieldType: e.value,
                            ...(e.value === SalesforceFieldType.DATE && { value: dateFieldValue.value }),
                          });
                        }
                      }}
                    />
                  </div>
                  <div>
                    {writeToPersonObjectFieldType.value === SalesforceFieldType.DATE ? (
                      <Select
                        options={dateFieldValueOptions}
                        value={dateFieldValue}
                        onChange={(e) => {
                          if (e) {
                            setDateValue(e);
                            setNewOnBookingWriteToPersonObjectField({
                              ...newOnBookingWriteToPersonObjectField,
                              value: e.value,
                            });
                          }
                        }}
                      />
                    ) : (
                      <InputField
                        value={newOnBookingWriteToPersonObjectField.value}
                        onChange={(e) =>
                          setNewOnBookingWriteToPersonObjectField({
                            ...newOnBookingWriteToPersonObjectField,
                            value: e.target.value,
                          })
                        }
                      />
                    )}
                  </div>
                  <div>
                    <Select
                      options={whenToWriteToRecordOptions}
                      value={whenToWriteToPersonRecord}
                      onChange={(e) => {
                        if (e) {
                          setWhenToWriteToPersonRecord(e);
                          setNewOnBookingWriteToPersonObjectField({
                            ...newOnBookingWriteToPersonObjectField,
                            whenToWrite: e.value,
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              <Button
                className="mt-2"
                size="sm"
                disabled={
                  !(
                    newOnBookingWriteToPersonObjectField.field &&
                    newOnBookingWriteToPersonObjectField.fieldType &&
                    newOnBookingWriteToPersonObjectField.value &&
                    newOnBookingWriteToPersonObjectField.whenToWrite
                  )
                }
                onClick={() => {
                  if (
                    Object.keys(onBookingWriteToRecordFields).includes(
                      newOnBookingWriteToEventObjectField.field.trim()
                    )
                  ) {
                    showToast("Field already exists", "error");
                    return;
                  }

                  setAppData("onBookingWriteToRecordFields", {
                    ...onBookingWriteToRecordFields,
                    [newOnBookingWriteToPersonObjectField.field.trim()]: {
                      fieldType: newOnBookingWriteToPersonObjectField.fieldType,
                      value: newOnBookingWriteToPersonObjectField.value,
                      whenToWrite: newOnBookingWriteToPersonObjectField.whenToWrite,
                    },
                  });
                  setNewOnBookingWriteToPersonObjectField({
                    field: "",
                    fieldType: writeToPersonObjectFieldType.value,
                    value: "",
                    whenToWrite: WhenToWriteToRecord.FIELD_EMPTY,
                  });
                }}>
                {t("add_new_field")}
              </Button>
            </div>
          ) : null}
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
            ) : null}
            <Alert className="mt-2" severity="neutral" title={t("skip_rr_description")} />
          </div>
        ) : null}

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
