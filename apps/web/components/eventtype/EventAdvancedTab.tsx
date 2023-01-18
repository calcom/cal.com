import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ErrorMessage } from "@hookform/error-message";
import Link from "next/link";
import type { CustomInputParsed, EventTypeSetupProps, FormValues } from "pages/event-types/[type]";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useFormContext } from "react-hook-form";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

//TODO: ManageBookings: Don't import from ReactAwesomeQueryBuilder instead make ReactAwesomeQueryBuilder use a common config that would be imported here as well
import config from "@calcom/app-store/ee/routing-forms/components/react-awesome-query-builder/config/config";
import Widgets, {
  ComponentProps,
} from "@calcom/app-store/ee/routing-forms/components/react-awesome-query-builder/widgets";
import DestinationCalendarSelector from "@calcom/features/calendars/DestinationCalendarSelector";
import { APP_NAME, CAL_URL, IS_SELF_HOSTED } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Badge,
  BooleanToggleGroupField,
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  Form,
  Icon,
  Input,
  InputField,
  Label,
  PhoneInput,
  SelectField,
  SettingsToggle,
  showToast,
  TextField,
  Tooltip,
} from "@calcom/ui";
import { AddressInput } from "@calcom/ui";

import CustomInputTypeForm from "@components/eventtype/CustomInputTypeForm";

import RequiresConfirmationController from "./RequiresConfirmationController";

const generateHashedLink = (id: number) => {
  const translator = short();
  const seed = `${id}:${new Date().getTime()}`;
  const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));
  return uid;
};

const getRandomId = (length = 8) => {
  return (
    -1 *
    parseInt(
      Math.ceil(Math.random() * Date.now())
        .toPrecision(length)
        .toString()
        .replace(".", "")
    )
  );
};

// TODO: ManageBookings: Move widgets along with it.
const Components = {
  text: {
    propsType: "text",
    factory: (props: ComponentProps) => <Widgets.TextWidget {...props} />,
  },
  textarea: {
    propsType: "text",
    factory: (props: ComponentProps) => <Widgets.TextAreaWidget {...props} />,
  },
  number: {
    propsType: "text",
    factory: (props: ComponentProps) => <Widgets.NumberWidget {...props} />,
  },
  multiselect: {
    propsType: "select",
    factory: (
      props: ComponentProps & {
        listValues: { title: string; value: string }[];
      }
    ) => <Widgets.MultiSelectWidget {...props} />,
  },
  select: {
    propsType: "select",
    factory: (
      props: ComponentProps & {
        listValues: { title: string; value: string }[];
      }
    ) => <Widgets.SelectWidget {...props} />,
  },
  phone: {
    propsType: "text",
    factory: (props: ComponentProps) => {
      if (!props) {
        return <div />;
      }

      return (
        <PhoneInput
          onChange={(val: string) => {
            props.setValue(val);
          }}
          {...props}
        />
      );
    },
    valuePlaceholder: "Enter Phone Number",
  },
  email: {
    propsType: "text",
    factory: (props: ComponentProps) => {
      if (!props) {
        return <div />;
      }
      // FIXME: type=email is removed so that RHF validations can work
      // But, RHF errors are not integrated in Routing Forms form
      return <Widgets.TextWidget {...props} />;
    },
  },
  multiemail: {
    propsType: "text",
    factory: (props: ComponentProps) => {
      //TODO: ManageBookings: Make it use multiemail
      return <Widgets.TextWidget type="email" {...props} />;
    },
    valuePlaceholder: "Enter Email Addresses",
  },
  address: {
    propsType: "text",
    factory: (props: ComponentProps) => {
      return (
        <AddressInput
          onChange={(val) => {
            props.setValue(val);
          }}
          {...props}
        />
      );
    },
  },
  radioInput: {
    propsType: "objectiveWithInput",
    factory: function RadioInputWithLabel({
      name,
      options,
      optionsInputs,
      value,
      setValue,
    }: {
      options: { label: string; value: string }[];
      optionsInputs: FormValues["bookingInputs"][number]["optionsInputs"];
      value: { value: string; optionValue: string };
      setValue: (val: { value: string; optionValue: string }) => void;
      name?: string;
    }) {
      useEffect(() => {
        setValue({
          value: options[0].value,
          optionValue: "",
        });
      }, []);
      // const getLocationInputField = () => {
      //   return (
      //     <div className="mb-4">
      //       {/* <Label>
      //       </Label> */}
      //       {Field ? (
      //         <div>
      //           <div className="mt-1">{Field}</div>
      //           {bookingForm.formState.errors.phone && (
      //             <div className="mt-2 flex items-center text-sm text-red-700 ">
      //               <Icon.FiInfo className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
      //               <p>{t("invalid_number")}</p>
      //             </div>
      //           )}
      //         </div>
      //       ) : null}
      //     </div>
      //   );
      // };

      return (
        <div>
          {/* <div className={classNames(locations.length <= 1 && "hidden")}> */}
          <div>
            {
              /*isRescheduleView*/ false ? (
                <div>
                  {/* <span className="block text-sm font-medium text-gray-700 dark:text-white">
                  {bookingInput.label}
                </span>
                <p className="mt-1 text-sm text-gray-500">
                  {getHumanReadableLocationValue(booking?.location, t)}
                </p> */}
                  <div>Show READONLY location</div>
                </div>
              ) : (
                <div
                  className="mb-4"
                  onChange={(e) => {
                    setValue({
                      // TODO: ManageBookings: onChange fires on parent of radio inputs but onChange isn't allowed to have a value for div in TS
                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      // @ts-ignore
                      value: e.target.value || "",
                      optionValue: "",
                    });
                  }}>
                  {options.map((option, i) => {
                    return (
                      <label key={i} className="block">
                        <input
                          type="radio"
                          name={name}
                          // disabled={!!disableLocations}
                          //TODO: ManageBookings: What does this location class do?
                          className="location dark:bg-darkgray-300 dark:border-darkgray-300 h-4 w-4 border-gray-300 text-black focus:ring-black ltr:mr-2 rtl:ml-2"
                          value={option.value}
                          defaultChecked={option.value === value?.value}
                        />
                        <span className="text-sm ltr:ml-2 ltr:mr-2 rtl:ml-2 dark:text-white">
                          {option.label ?? ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )
            }
          </div>
          {(() => {
            const optionField = optionsInputs[value?.value];
            if (!optionField) {
              return null;
            }
            return (
              <div>
                <ComponentForField
                  field={optionField}
                  value={value?.optionValue}
                  setValue={(val) => {
                    setValue({
                      value: value?.value,
                      optionValue: val,
                    });
                  }}
                />
              </div>
            );
          })()}
        </div>
      );
    },
  },
} as const;

//TODO: ManageBookings: Extract to a reusable component
function FormBuilder({
  title,
  description,
  addFieldLabel,
}: {
  title: string;
  description: string;
  addFieldLabel: string;
}) {
  const FieldTypes: {
    value: FormValues["bookingInputs"][number]["type"];
    label: string;
    needsOptions?: boolean;
    systemOnly?: boolean;
  }[] = [
    {
      label: "Short Text",
      value: "text",
    },
    {
      label: "Number",
      value: "number",
    },
    {
      label: "Long Text",
      value: "textarea",
    },
    {
      label: "Select",
      value: "select",
      needsOptions: true,
    },
    {
      label: "MultiSelect",
      value: "multiselect",
      needsOptions: true,
    },
    {
      label: "Phone",
      value: "phone",
    },
    {
      label: "Email",
      value: "email",
    },
    {
      label: "Multiple Emails",
      value: "multiemail",
    },
    {
      label: "Location",
      value: "radioInput",
      systemOnly: true,
    },
  ];
  const fieldsForm = useFormContext<FormValues>();

  const fieldForm = useForm<FormValues["bookingInputs"][0]>();
  const { fields, swap, remove } = useFieldArray({
    control: fieldsForm.control,
    // TODO: Make it configurable
    name: "bookingInputs",
  });

  function OptionsField({
    label = "Options",
    value,
    onChange,
    className = "",
    readOnly = false,
  }: {
    label?: string;
    value: { label: string; value: string }[];
    onChange: (value: { label: string; value: string }[]) => void;
    className?: string;
    readOnly?: boolean;
  }) {
    const [animationRef] = useAutoAnimate<HTMLUListElement>();
    value = value || [
      {
        label: "Option 1",
        value: "1",
      },
      {
        label: "Option 2",
        value: "2",
      },
    ];
    // const [optionsState, setOptionsState] = useState(options);
    return (
      <div className={className}>
        <Label>{label}</Label>
        <div className="rounded-md bg-gray-50 p-4">
          <ul ref={animationRef}>
            {value?.map((option, index) => (
              <li key={index}>
                <div className="flex items-center">
                  <Input value={option.label} readOnly={readOnly} placeholder={`Enter Option ${index + 1}`} />
                  {value.length > 2 && !readOnly && (
                    <Button
                      type="button"
                      className="mb-2 -ml-8 hover:!bg-transparent focus:!bg-transparent focus:!outline-none focus:!ring-0"
                      size="icon"
                      color="minimal"
                      StartIcon={Icon.FiX}
                      onClick={() => {
                        if (!value) {
                          return;
                        }
                        const newOptions = [...value];
                        newOptions.splice(index, 1);
                        onChange(newOptions);
                      }}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
          {!readOnly && (
            <Button
              color="minimal"
              onClick={() => {
                value.push({ label: "", value: `${value.length + 1}` });
                onChange(value);
              }}
              StartIcon={Icon.FiPlus}>
              Add an Option
            </Button>
          )}
        </div>
      </div>
    );
  }
  const [isAddQuestionFormOpen, setIsAddFieldFormOpen] = useState(false);
  const fieldType = FieldTypes.find((f) => f.value === fieldForm.watch("type"));
  return (
    <div>
      <div>
        <div className="text-sm font-semibold text-gray-700 ltr:mr-1 rtl:ml-1">{title}</div>
        <p className=" max-w-[280px] break-words py-1 text-sm text-gray-500 sm:max-w-[500px]">
          {description}
        </p>
        <ul className="mt-2 rounded-md border">
          {fields.map((input, index) => {
            const fieldType = FieldTypes.find((f) => f.value === input.type);
            if (!fieldType) {
              throw new Error(`Invalid field type - ${input.type}`);
            }
            return (
              <li key={index} className="group relative flex justify-between border-b p-4 last:border-b-0">
                <button
                  type="button"
                  className="invisible absolute -left-[12px] ml-0 flex  h-6 w-6 scale-0 items-center justify-center rounded-md border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow disabled:hover:border-inherit disabled:hover:text-gray-400 disabled:hover:shadow-none group-hover:visible group-hover:scale-100"
                  onClick={() => swap(index, index - 1)}>
                  <Icon.FiArrowUp className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="invisible absolute -left-[12px] mt-8 ml-0 flex  h-6 w-6 scale-0  items-center justify-center rounded-md border bg-white p-1 text-gray-400 transition-all hover:border-transparent hover:text-black hover:shadow disabled:hover:border-inherit disabled:hover:text-gray-400 disabled:hover:shadow-none group-hover:visible group-hover:scale-100"
                  onClick={() => swap(index, index + 1)}>
                  <Icon.FiArrowDown className="h-5 w-5" />
                </button>
                <div className="flex">
                  <div>
                    <div className="text-sm font-semibold text-gray-700 ltr:mr-1 rtl:ml-1">{input.label}</div>
                    <p className="max-w-[280px] break-words py-1 text-sm text-gray-500 sm:max-w-[500px]">
                      {fieldType.label}
                    </p>
                  </div>
                  <div className="space-x-2">
                    <Badge variant="gray">{input.required ? "Required" : "Optional"}</Badge>
                    {input.readOnly && <Badge variant="gray">Readonly</Badge>}
                  </div>
                </div>
                {!input.readOnly && (
                  <div className="flex items-center">
                    <Button color="secondary">Edit</Button>
                    {!input.mustHave && (
                      <Button
                        color="minimal"
                        onClick={() => {
                          remove(index);
                        }}
                        StartIcon={Icon.FiTrash2}
                      />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <Button
          color="minimal"
          onClick={() => setIsAddFieldFormOpen(true)}
          className="mt-4"
          StartIcon={Icon.FiPlus}>
          {addFieldLabel}
        </Button>
      </div>
      <Dialog open={isAddQuestionFormOpen} onOpenChange={setIsAddFieldFormOpen}>
        <DialogContent>
          <DialogHeader title="Add a question" subtitle="Customize the questions asked on the booking page" />
          <div>
            <Form
              form={fieldForm}
              handleSubmit={(data) => {
                fieldsForm.setValue("bookingInputs", [...fieldsForm.getValues("bookingInputs"), data]);
                setIsAddFieldFormOpen(false);
              }}>
              <SelectField
                onChange={(e) => {
                  const value = e?.value;
                  if (!value) {
                    return;
                  }
                  fieldForm.setValue("type", value);
                }}
                options={FieldTypes.filter((f) => !f.systemOnly)}
                label="Input Type"
              />
              <InputField {...fieldForm.register("label")} containerClassName="mt-6" label="Label" />
              <InputField {...fieldForm.register("name")} containerClassName="mt-6" label="Name" />
              {fieldType?.needsOptions ? (
                <Controller
                  name="options"
                  render={({ field: { value, onChange } }) => {
                    return <OptionsField onChange={onChange} value={value} className="mt-6" />;
                  }}
                />
              ) : null}
              <Controller
                name="required"
                control={fieldForm.control}
                render={({ field: { value, onChange } }) => {
                  return (
                    <BooleanToggleGroupField
                      value={value}
                      onValueChange={(val) => {
                        onChange(val);
                      }}
                      label="Required"
                    />
                  );
                }}
              />
              <DialogFooter>
                <DialogClose color="secondary">Cancel</DialogClose>
                <Button type="submit">Add</Button>
              </DialogFooter>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
const ComponentForField = ({
  field,
  value,
  setValue,
}: {
  field: {
    name?: string;
    options?: FormValues["bookingInputs"][number]["options"];
    optionsInputs?: FormValues["bookingInputs"][number]["optionsInputs"];
    type: FormValues["bookingInputs"][number]["type"];
  };
  value:
    | string
    | {
        value: string;
        optionValue: string;
      };
  setValue: ((value: string) => void) | ((value: { value: string; optionValue: string }) => void);
}) => {
  const componentConfig = Components[field.type];

  const isObjectiveWithInputValue = (value: any): value is { value: string } => {
    if (typeof value === "undefined") {
      return true;
    }
    return typeof value === "object" && "value" in value;
  };

  if (componentConfig.propsType === "text") {
    value = value || "";
    if (isObjectiveWithInputValue(value)) {
      throw new Error(`${value}: Value is not of type string for field type ${field.type}`);
    }
    return <componentConfig.factory value={value} setValue={setValue as (value: string) => void} />;
  }

  if (componentConfig.propsType === "select") {
    value = value || "";
    if (isObjectiveWithInputValue(value)) {
      throw new Error(`${value}: Value is not of type string for field type ${field.type}`);
    }
    if (!field.options) {
      throw new Error("Field options is not defined");
    }

    return (
      <componentConfig.factory
        value={value}
        setValue={setValue as (value: string) => void}
        listValues={field.options.map((o) => ({ ...o, title: o.label }))}
      />
    );
  }

  if (componentConfig.propsType === "objectiveWithInput") {
    if (!isObjectiveWithInputValue(value)) {
      throw new Error("Value is not of type {value: string}");
    }
    if (!field.options) {
      throw new Error("Field options is not defined");
    }
    if (!field.optionsInputs) {
      throw new Error("Field optionsInputs is not defined");
    }
    return (
      <componentConfig.factory
        name={field.name}
        value={value}
        setValue={setValue as (value: { value: string; optionValue: string }) => void}
        optionsInputs={field.optionsInputs}
        options={field.options}
      />
    );
  }
  return null;
};

//TODO: ManageBookings: Move it along FormBuilder - Also create a story for it.
//TODO: Move rescheduleUid to a variant of FormBuilderField maybe?
export const FormBuilderField = ({
  field,
  hookForm,
  rescheduleUid,
}: {
  field: FormValues["bookingInputs"][number];
}) => {
  const { t } = useLocale();

  return (
    <div className="reloading mb-4">
      <Controller
        control={hookForm.control}
        name={`inputs.${field.name}`}
        render={({ field: { value, onChange } }) => {
          return (
            <div>
              <Label>{field.label}</Label>
              <ComponentForField
                // className={
                //   hookForm.formState.errors[`inputs.${field.name}`] && "!focus:ring-red-700 !border-red-700"
                // }
                field={field}
                value={value}
                setValue={(val: any) => {
                  if (!val) {
                    return;
                  }
                  onChange(val);
                }}
              />
              <ErrorMessage
                name="inputs"
                errors={hookForm.formState.errors}
                render={({ message }) => {
                  const name = message?.replace(/\{([^}]+)\}.*/, "$1");
                  // Use the message targeted for it.
                  if (name !== field.name) {
                    return null;
                  }
                  console.log(name, field.name, message, "ErrorMesg");

                  message = message.replace(/\{[^}]+\}(.*)/, "$1");
                  return (
                    <div data-field-name={field.name} className="flex items-center text-sm text-red-700 ">
                      <Icon.FiInfo className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
                      <p>{t(message)}</p>
                    </div>
                  );
                }}
              />
            </div>
          );
        }}
      />
    </div>
  );
};

export const EventAdvancedTab = ({ eventType, team }: Pick<EventTypeSetupProps, "eventType" | "team">) => {
  const connectedCalendarsQuery = trpc.viewer.connectedCalendars.useQuery();
  const formMethods = useFormContext<FormValues>();
  const { t } = useLocale();
  const [showEventNameTip, setShowEventNameTip] = useState(false);
  const [hashedLinkVisible, setHashedLinkVisible] = useState(!!eventType.hashedLink);
  const [redirectUrlVisible, setRedirectUrlVisible] = useState(!!eventType.successRedirectUrl);
  const [hashedUrl, setHashedUrl] = useState(eventType.hashedLink?.link);
  const [customInputs, setCustomInputs] = useState<CustomInputParsed[]>(
    eventType.customInputs.sort((a, b) => a.id - b.id) || []
  );
  const [selectedCustomInput, setSelectedCustomInput] = useState<CustomInputParsed | undefined>(undefined);
  const [selectedCustomInputModalOpen, setSelectedCustomInputModalOpen] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(eventType.requiresConfirmation);
  const placeholderHashedLink = `${CAL_URL}/d/${hashedUrl}/${eventType.slug}`;
  const seatsEnabled = formMethods.getValues("seatsPerTimeSlotEnabled");

  const removeCustom = (index: number) => {
    formMethods.getValues("customInputs").splice(index, 1);
    customInputs.splice(index, 1);
    setCustomInputs([...customInputs]);
  };

  useEffect(() => {
    !hashedUrl && setHashedUrl(generateHashedLink(eventType.users[0]?.id ?? team?.id));
  }, [eventType.users, hashedUrl, team?.id]);

  useEffect(() => {
    if (eventType.customInputs) {
      setCustomInputs(eventType.customInputs.sort((a, b) => a.id - b.id));
    }
  }, [eventType.customInputs]);

  return (
    <div className="flex flex-col space-y-8">
      {/**
       * Only display calendar selector if user has connected calendars AND if it's not
       * a team event. Since we don't have logic to handle each attendee calendar (for now).
       * This will fallback to each user selected destination calendar.
       */}
      {!!connectedCalendarsQuery.data?.connectedCalendars.length && !team && (
        <div className="flex flex-col">
          <div className="flex justify-between">
            <Label>{t("add_to_calendar")}</Label>
            <Link
              href="/apps/categories/calendar"
              target="_blank"
              className="text-sm text-gray-600 hover:text-gray-900">
              {t("add_another_calendar")}
            </Link>
          </div>
          <div className="-mt-1 w-full">
            <Controller
              control={formMethods.control}
              name="destinationCalendar"
              defaultValue={eventType.destinationCalendar || undefined}
              render={({ field: { onChange, value } }) => (
                <DestinationCalendarSelector
                  destinationCalendar={eventType.destinationCalendar}
                  value={value ? value.externalId : undefined}
                  onChange={onChange}
                  hidePlaceholder
                />
              )}
            />
          </div>
          <p className="text-sm text-gray-600">{t("select_which_cal")}</p>
        </div>
      )}
      <div className="w-full">
        <TextField
          label={t("event_name")}
          type="text"
          placeholder={t("meeting_with_user", { attendeeName: eventType.users[0]?.name })}
          defaultValue={eventType.eventName || ""}
          {...formMethods.register("eventName")}
          addOnSuffix={
            <Button
              type="button"
              StartIcon={Icon.FiEdit}
              size="icon"
              color="minimal"
              className="hover:stroke-3 min-w-fit px-0 hover:bg-transparent hover:text-black"
              onClick={() => setShowEventNameTip((old) => !old)}
            />
          }
        />
      </div>
      <hr />
      {/* <div className="">
        <SettingsToggle
          title={t("additional_inputs")}
          description={t("additional_input_description")}
          checked={customInputs.length > 0}
          onCheckedChange={(e) => {
            if (e && customInputs.length === 0) {
              // Push a placeholders
              setSelectedCustomInputModalOpen(true);
            } else if (!e) {
              formMethods.setValue("customInputs", []);
            }
          }}>
          <ul className="my-4 rounded-md border">
            {customInputs.map((customInput, idx) => (
              <CustomInputItem
                key={idx}
                question={customInput.label}
                type={customInput.type}
                required={customInput.required}
                editOnClick={() => {
                  setSelectedCustomInput(customInput);
                  setSelectedCustomInputModalOpen(true);
                }}
                deleteOnClick={() => removeCustom(idx)}
              />
            ))}
          </ul>
          {customInputs.length > 0 && (
            <Button
              StartIcon={Icon.FiPlus}
              color="minimal"
              type="button"
              onClick={() => {
                setSelectedCustomInput(undefined);
                setSelectedCustomInputModalOpen(true);
              }}>
              {t("add_input")}
            </Button>
          )}
        </SettingsToggle>
      </div> */}
      <FormBuilder
        title="Booking questions"
        description="Customize the questions asked on the booking page"
        addFieldLabel="Add a question"
      />
      <hr />
      <RequiresConfirmationController
        seatsEnabled={seatsEnabled}
        metadata={eventType.metadata}
        requiresConfirmation={requiresConfirmation}
        onRequiresConfirmation={setRequiresConfirmation}
      />
      <hr />
      <Controller
        name="disableGuests"
        control={formMethods.control}
        defaultValue={eventType.disableGuests}
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            title={t("disable_guests")}
            description={t("disable_guests_description")}
            checked={value}
            onCheckedChange={(e) => onChange(e)}
            disabled={seatsEnabled}
          />
        )}
      />

      <hr />
      <Controller
        name="hideCalendarNotes"
        control={formMethods.control}
        defaultValue={eventType.hideCalendarNotes}
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            title={t("disable_notes")}
            description={t("disable_notes_description")}
            checked={value}
            onCheckedChange={(e) => onChange(e)}
          />
        )}
      />
      <hr />
      <Controller
        name="metadata.additionalNotesRequired"
        control={formMethods.control}
        defaultValue={!!eventType.metadata.additionalNotesRequired}
        render={({ field: { value, onChange } }) => (
          <div className="flex space-x-3 ">
            <SettingsToggle
              title={t("require_additional_notes")}
              description={t("require_additional_notes_description")}
              checked={!!value}
              onCheckedChange={(e) => onChange(e)}
            />
          </div>
        )}
      />
      <hr />
      <Controller
        name="successRedirectUrl"
        control={formMethods.control}
        render={({ field: { value, onChange } }) => (
          <>
            <SettingsToggle
              title={t("redirect_success_booking")}
              description={t("redirect_url_description")}
              checked={redirectUrlVisible}
              onCheckedChange={(e) => {
                setRedirectUrlVisible(e);
                onChange(e ? value : "");
              }}>
              {/* Textfield has some margin by default we remove that so we can keep consitant aligment */}
              <div className="lg:-ml-2">
                <TextField
                  label={t("redirect_success_booking")}
                  labelSrOnly
                  placeholder={t("external_redirect_url")}
                  required={redirectUrlVisible}
                  type="text"
                  defaultValue={eventType.successRedirectUrl || ""}
                  {...formMethods.register("successRedirectUrl")}
                />
                <div className="mt-2 flex">
                  <Checkbox
                    description={t("disable_success_page")}
                    // Disable if it's not Self Hosted or if the redirect url is not set
                    disabled={!IS_SELF_HOSTED || !formMethods.watch("successRedirectUrl")}
                    {...formMethods.register("metadata.disableSuccessPage")}
                  />
                  {/*TODO: Extract it out into a component when used more than once*/}
                  {!IS_SELF_HOSTED && (
                    <Link href="https://cal.com/pricing" target="_blank">
                      <Badge variant="orange" className="ml-2">
                        Platform Only
                      </Badge>
                    </Link>
                  )}
                </div>
              </div>
            </SettingsToggle>
          </>
        )}
      />
      <hr />
      <SettingsToggle
        data-testid="hashedLinkCheck"
        title={t("private_link")}
        description={t("private_link_description", { appName: APP_NAME })}
        checked={hashedLinkVisible}
        onCheckedChange={(e) => {
          formMethods.setValue("hashedLink", e ? hashedUrl : undefined);
          setHashedLinkVisible(e);
        }}>
        {/* Textfield has some margin by default we remove that so we can keep consitant aligment */}
        <div className="lg:-ml-2">
          <TextField
            disabled
            name="hashedLink"
            label={t("private_link_label")}
            data-testid="generated-hash-url"
            labelSrOnly
            type="text"
            hint={t("private_link_hint")}
            defaultValue={placeholderHashedLink}
            addOnSuffix={
              <Tooltip content={eventType.hashedLink ? t("copy_to_clipboard") : t("enabled_after_update")}>
                <Button
                  color="minimal"
                  onClick={() => {
                    navigator.clipboard.writeText(placeholderHashedLink);
                    if (eventType.hashedLink) {
                      showToast(t("private_link_copied"), "success");
                    } else {
                      showToast(t("enabled_after_update_description"), "warning");
                    }
                  }}
                  className="hover:stroke-3 hover:bg-transparent hover:text-black"
                  type="button">
                  <Icon.FiCopy />
                </Button>
              </Tooltip>
            }
          />
        </div>
      </SettingsToggle>
      <hr />
      <Controller
        name="seatsPerTimeSlotEnabled"
        control={formMethods.control}
        defaultValue={!!eventType.seatsPerTimeSlot}
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            title={t("offer_seats")}
            description={t("offer_seats_description")}
            checked={value}
            onCheckedChange={(e) => {
              // Enabling seats will disable guests and requiring confirmation until fully supported
              if (e) {
                formMethods.setValue("disableGuests", true);
                formMethods.setValue("requiresConfirmation", false);
                setRequiresConfirmation(false);
                formMethods.setValue("seatsPerTimeSlot", 2);
              } else {
                formMethods.setValue("seatsPerTimeSlot", null);
                formMethods.setValue("disableGuests", false);
              }
              onChange(e);
            }}>
            <Controller
              name="seatsPerTimeSlot"
              control={formMethods.control}
              defaultValue={eventType.seatsPerTimeSlot}
              render={({ field: { value, onChange } }) => (
                <div className="lg:-ml-2">
                  <TextField
                    required
                    name="seatsPerTimeSlot"
                    labelSrOnly
                    label={t("number_of_seats")}
                    type="number"
                    defaultValue={value || 2}
                    min={1}
                    addOnSuffix={<>{t("seats")}</>}
                    onChange={(e) => {
                      onChange(Math.abs(Number(e.target.value)));
                    }}
                  />
                  <div className="mt-2">
                    <Checkbox
                      description={t("show_attendees")}
                      onChange={(e) => formMethods.setValue("seatsShowAttendees", e.target.checked)}
                      defaultChecked={!!eventType.seatsShowAttendees}
                    />
                  </div>
                </div>
              )}
            />
          </SettingsToggle>
        )}
      />

      {showEventNameTip && (
        <Dialog open={showEventNameTip} onOpenChange={setShowEventNameTip}>
          <DialogContent
            title={t("custom_event_name")}
            description={t("custom_event_name_description")}
            type="creation">
            <TextField
              label={t("event_name")}
              type="text"
              placeholder={t("meeting_with_user", { attendeeName: eventType.users[0]?.name })}
              defaultValue={eventType.eventName || ""}
              {...formMethods.register("eventName")}
            />
            <div className="mt-1 text-gray-500">
              <p>{`{HOST} = ${t("your_name")}`}</p>
              <p>{`{ATTENDEE} = ${t("attendee_name")}`}</p>
              <p>{`{HOST/ATTENDEE} = ${t("dynamically_display_attendee_or_organizer")}`}</p>
              <p>{`{LOCATION} = ${t("event_location")}`}</p>
            </div>
            <DialogFooter>
              <Button color="primary" onClick={() => setShowEventNameTip(false)}>
                {t("create")}
              </Button>
              <DialogClose onClick={() => formMethods.setValue("eventName", eventType.eventName ?? "")} />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <Controller
        name="customInputs"
        control={formMethods.control}
        defaultValue={customInputs}
        render={() => (
          <Dialog open={selectedCustomInputModalOpen} onOpenChange={setSelectedCustomInputModalOpen}>
            <DialogContent
              type="creation"
              Icon={Icon.FiPlus}
              title={t("add_new_custom_input_field")}
              description={t("this_input_will_shown_booking_this_event")}>
              <CustomInputTypeForm
                selectedCustomInput={selectedCustomInput}
                onSubmit={(values) => {
                  const customInput: CustomInputParsed = {
                    id: getRandomId(),
                    eventTypeId: -1,
                    label: values.label,
                    placeholder: values.placeholder,
                    required: values.required,
                    type: values.type,
                    options: values.options,
                    hasToBeCreated: true,
                  };
                  if (selectedCustomInput) {
                    selectedCustomInput.label = customInput.label;
                    selectedCustomInput.placeholder = customInput.placeholder;
                    selectedCustomInput.required = customInput.required;
                    selectedCustomInput.type = customInput.type;
                    selectedCustomInput.options = customInput.options || undefined;
                    selectedCustomInput.hasToBeCreated = false;
                    // Update by id
                    const inputIndex = customInputs.findIndex((input) => input.id === values.id);
                    customInputs[inputIndex] = selectedCustomInput;
                    setCustomInputs(customInputs);
                    formMethods.setValue("customInputs", customInputs);
                  } else {
                    const concatted = customInputs.concat({
                      ...customInput,
                      options: customInput.options,
                    });
                    console.log(concatted);
                    setCustomInputs(concatted);
                    formMethods.setValue("customInputs", concatted);
                  }

                  setSelectedCustomInputModalOpen(false);
                }}
                onCancel={() => {
                  setSelectedCustomInputModalOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      />
    </div>
  );
};
