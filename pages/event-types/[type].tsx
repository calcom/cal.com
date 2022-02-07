import { XIcon } from "@heroicons/react/outline";
import {
  ChevronRightIcon,
  ClockIcon,
  DocumentIcon,
  ExternalLinkIcon,
  LinkIcon,
  LocationMarkerIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UserAddIcon,
  UsersIcon,
} from "@heroicons/react/solid";
import { EventTypeCustomInput, PeriodType, Prisma, SchedulingType } from "@prisma/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import * as RadioGroup from "@radix-ui/react-radio-group";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FormattedNumber, IntlProvider } from "react-intl";
import Select from "react-select";
import { JSONObject } from "superjson/dist/types";

import { StripeData } from "@ee/lib/stripe/server";

import { asStringOrThrow, asStringOrUndefined } from "@lib/asStringOrNull";
import { getSession } from "@lib/auth";
import { HttpError } from "@lib/core/http/error";
import { FormData, NFT, Token, OptionTypeBase } from "@lib/event-types";
import { useLocale } from "@lib/hooks/useLocale";
import getIntegrations, { hasIntegration } from "@lib/integrations/getIntegrations";
import { LocationType } from "@lib/location";
import showToast from "@lib/notification";
import prisma from "@lib/prisma";
import { defaultAvatarSrc } from "@lib/profile";
import { trpc } from "@lib/trpc";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import DestinationCalendarSelector from "@components/DestinationCalendarSelector";
import { Dialog, DialogContent, DialogTrigger } from "@components/Dialog";
import Shell from "@components/Shell";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import EventTypeLocationPicker, {
  addDefaultLocationOptions,
} from "@components/eventtype/EventTypeLocationPicker";
import { Form, TextArea } from "@components/form/fields";
import CustomInputTypeForm from "@components/pages/eventtypes/CustomInputTypeForm";
import Button from "@components/ui/Button";
import InfoBadge from "@components/ui/InfoBadge";
import { Scheduler } from "@components/ui/Scheduler";
import Switch from "@components/ui/Switch";
import CheckboxField from "@components/ui/form/CheckboxField";
import CheckedSelect from "@components/ui/form/CheckedSelect";
import { DateRangePicker } from "@components/ui/form/DateRangePicker";
import MinutesField from "@components/ui/form/MinutesField";
import * as RadioArea from "@components/ui/form/radio-area";

import bloxyApi from "../../web3/dummyResps/bloxyApi";

dayjs.extend(utc);
dayjs.extend(timezone);

const EventTypePage = (props: inferSSRProps<typeof getServerSideProps>) => {
  const { t } = useLocale();
  const router = useRouter();
  const { eventType, locationOptions, availability, team, teamMembers, hasPaymentIntegration, currency } =
    props;
  const [editIcon, setEditIcon] = useState(true);

  const [selectedTimeZone, setSelectedTimeZone] = useState("");
  const [selectedCustomInput, setSelectedCustomInput] = useState<EventTypeCustomInput | undefined>(undefined);
  const [selectedCustomInputModalOpen, setSelectedCustomInputModalOpen] = useState(false);
  const [customInputs, setCustomInputs] = useState<EventTypeCustomInput[]>(
    eventType.customInputs.sort((a, b) => a.id - b.id) || []
  );
  const [tokensList, setTokensList] = useState<Array<Token>>([]);
  const [requirePayment, setRequirePayment] = useState(eventType.price > 0);
  const [advancedSettingsVisible, setAdvancedSettingsVisible] = useState(false);

  const PERIOD_TYPES = [
    {
      type: "ROLLING" as const,
      suffix: t("into_the_future"),
    },
    {
      type: "RANGE" as const,
      prefix: t("within_date_range"),
    },
    {
      type: "UNLIMITED" as const,
      prefix: t("indefinitely_into_future"),
    },
  ];

  const periodType =
    PERIOD_TYPES.find((s) => s.type === eventType.periodType) ||
    PERIOD_TYPES.find((s) => s.type === "UNLIMITED");

  const [periodDates] = useState<{ startDate: Date; endDate: Date }>({
    startDate: new Date(eventType.periodStartDate || Date.now()),
    endDate: new Date(eventType.periodEndDate || Date.now()),
  });

  const permalink = `${process.env.NEXT_PUBLIC_APP_URL}/${
    team ? `team/${team.slug}` : eventType.users[0].username
  }/${eventType.slug}`;

  /** Append default locations */
  const defaultLocations = [
    { value: LocationType.InPerson, label: t("in_person_meeting") },
    { value: LocationType.Phone, label: t("phone_call") },
  ];
  addDefaultLocationOptions(defaultLocations, locationOptions);

  const formMethods = useForm<FormData>({
    defaultValues: {
      locations: eventType.locations || [],
      periodDates: {
        startDate: periodDates.startDate,
        endDate: periodDates.endDate,
      },
    },
  });

  const schedulingTypeOptions: { value: SchedulingType; label: string; description: string }[] = [
    {
      value: SchedulingType.COLLECTIVE,
      label: t("collective"),
      description: t("collective_description"),
    },
    {
      value: SchedulingType.ROUND_ROBIN,
      label: t("round_robin"),
      description: t("round_robin_description"),
    },
  ];

  const mapUserToValue = ({
    id,
    name,
    avatar,
  }: {
    id: number | null;
    name: string | null;
    avatar: string | null;
  }) => ({
    value: `${id || ""}`,
    label: `${name || ""}`,
    avatar: `${avatar || ""}`,
  });

  const removeCustom = (index: number) => {
    formMethods.getValues("customInputs").splice(index, 1);
    customInputs.splice(index, 1);
    setCustomInputs([...customInputs]);
  };

  const connectedCalendarsQuery = trpc.useQuery(["viewer.connectedCalendars"]);

  const updateMutation = trpc.useMutation("viewer.eventTypes.update", {
    onSuccess: async ({ eventType }) => {
      await router.push("/event-types");
      showToast(t("event_type_updated_successfully", { eventTypeTitle: eventType.title }), "success");
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  const deleteMutation = trpc.useMutation("viewer.eventTypes.delete", {
    onSuccess: async () => {
      await router.push("/event-types");
      showToast(t("event_type_deleted_successfully"), "success");
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  async function deleteEventTypeHandler(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    event.preventDefault();

    const payload = { id: eventType.id };
    deleteMutation.mutate(payload);
  }

  useEffect(() => {
    const fetchTokens = async () => {
      // Get a list of most popular ERC20s and ERC777s, combine them into a single list, set as tokensList
      try {
        const erc20sList: Array<Token> =
          //   await axios.get(`https://api.bloxy.info/token/list?key=${process.env.BLOXY_API_KEY}`)
          // ).data
          bloxyApi.slice(0, 100).map((erc20: Token) => {
            const { name, address, symbol } = erc20;
            return { name, address, symbol };
          });

        const exodiaList = await (await fetch(`https://exodia.io/api/trending?page=1`)).json();

        const nftsList: Array<Token> = exodiaList.map((nft: NFT) => {
          const { name, contracts } = nft;
          if (nft.contracts[0]) {
            const { address, symbol } = contracts[0];
            return { name, address, symbol };
          }
        });

        const unifiedList: Array<Token> = [...erc20sList, ...nftsList];

        setTokensList(unifiedList);
      } catch (err) {
        showToast("Failed to load ERC20s & NFTs list. Please enter an address manually.", "error");
      }
    };

    console.log(tokensList); // Just here to make sure it passes the gc hook. Can remove once actual use is made of tokensList.

    fetchTokens();
  }, []);

  useEffect(() => {
    setSelectedTimeZone(eventType.timeZone || "");
  }, []);

  return (
    <div>
      <Shell
        centered
        title={t("event_type_title", { eventTypeTitle: eventType.title })}
        heading={
          <div className="relative cursor-pointer group" onClick={() => setEditIcon(false)}>
            {editIcon ? (
              <>
                <h1
                  style={{ fontSize: 22, letterSpacing: "-0.0009em" }}
                  className="inline pl-0 text-gray-900 focus:text-black group-hover:text-gray-500">
                  {eventType.title}
                </h1>
                <PencilIcon className="inline w-4 h-4 ml-1 -mt-1 text-gray-700 group-hover:text-gray-500" />
              </>
            ) : (
              <div style={{ marginBottom: -11 }}>
                <input
                  type="text"
                  autoFocus
                  style={{ top: -6, fontSize: 22 }}
                  required
                  className="relative w-full h-10 pl-0 text-gray-900 bg-transparent border-none cursor-pointer focus:text-black hover:text-gray-700 focus:ring-0 focus:outline-none"
                  placeholder={t("quick_chat")}
                  {...formMethods.register("title")}
                  defaultValue={eventType.title}
                />
              </div>
            )}
          </div>
        }
        subtitle={eventType.description || ""}>
        <div className="block mx-auto sm:flex md:max-w-5xl">
          <div className="w-full ltr:mr-2 rtl:ml-2 sm:w-9/12">
            <div className="p-4 py-6 -mx-4 bg-white border rounded-sm border-neutral-200 sm:mx-0 sm:px-8">
              <Form
                form={formMethods}
                handleSubmit={async (values) => {
                  const { periodDates, periodCountCalendarDays, smartContractAddress, ...input } = values;
                  updateMutation.mutate({
                    ...input,
                    periodStartDate: periodDates.startDate,
                    periodEndDate: periodDates.endDate,
                    periodCountCalendarDays: periodCountCalendarDays === "1",
                    id: eventType.id,
                    metadata: smartContractAddress
                      ? {
                          smartContractAddress,
                        }
                      : undefined,
                  });
                }}
                className="space-y-6">
                <div className="space-y-3">
                  <div className="items-center block sm:flex">
                    <div className="mb-4 min-w-48 sm:mb-0">
                      <label htmlFor="slug" className="flex text-sm font-medium text-neutral-700">
                        <LinkIcon className="w-4 h-4 ltr:mr-2 rtl:ml-2 mt-0.5 text-neutral-500" />
                        {t("url")}
                      </label>
                    </div>
                    <div className="w-full">
                      <div className="flex rounded-sm shadow-sm">
                        <span className="inline-flex items-center px-3 text-gray-500 border border-r-0 border-gray-300 rounded-l-sm bg-gray-50 sm:text-sm">
                          {process.env.NEXT_PUBLIC_APP_URL?.replace(/^(https?:|)\/\//, "")}/
                          {team ? "team/" + team.slug : eventType.users[0].username}/
                        </span>
                        <input
                          type="text"
                          required
                          className="flex-1 block w-full min-w-0 border-gray-300 rounded-none rounded-r-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          defaultValue={eventType.slug}
                          {...formMethods.register("slug")}
                        />
                      </div>
                    </div>
                  </div>
                  <Controller
                    name="length"
                    control={formMethods.control}
                    defaultValue={eventType.length || 15}
                    render={() => (
                      <MinutesField
                        label={
                          <>
                            <ClockIcon className="w-4 h-4 ltr:mr-2 rtl:ml-2 mt-0.5 text-neutral-500" />{" "}
                            {t("duration")}
                          </>
                        }
                        id="length"
                        required
                        min="1"
                        placeholder="15"
                        defaultValue={eventType.length || 15}
                        onChange={(e) => {
                          formMethods.setValue("length", Number(e.target.value));
                        }}
                      />
                    )}
                  />
                </div>
                <hr />
                <div className="space-y-3">
                  <div className="block sm:flex">
                    <div className="min-w-48 sm:mb-0">
                      <label htmlFor="location" className="flex mt-2.5 text-sm font-medium text-neutral-700">
                        <LocationMarkerIcon className="w-4 h-4 ltr:mr-2 rtl:ml-2 mt-0.5 text-neutral-500" />
                        {t("location")}
                      </label>
                    </div>
                    <Controller
                      name="locations"
                      control={formMethods.control}
                      defaultValue={eventType.locations || []}
                      render={() => <EventTypeLocationPicker locationOptions={props.locationOptions} />}
                    />
                  </div>
                </div>
                <hr className="border-neutral-200" />
                <div className="space-y-3">
                  <div className="block sm:flex">
                    <div className="mb-4 min-w-48 sm:mb-0 mt-2.5">
                      <label htmlFor="description" className="flex mt-0 text-sm font-medium text-neutral-700">
                        <DocumentIcon className="w-4 h-4 ltr:mr-2 rtl:ml-2 mt-0.5 text-neutral-500" />
                        {t("description")}
                      </label>
                    </div>
                    <TextArea
                      className="w-full"
                      id="description"
                      placeholder={t("quick_video_meeting")}
                      defaultValue={asStringOrUndefined(eventType.description)}
                      {...formMethods.register("description")}
                    />
                  </div>
                </div>
                {team && <hr className="border-neutral-200" />}
                {team && (
                  <div className="space-y-3">
                    <div className="block sm:flex">
                      <div className="mb-4 min-w-48 sm:mb-0">
                        <label
                          htmlFor="schedulingType"
                          className="flex mt-2 text-sm font-medium text-neutral-700">
                          <UsersIcon className="w-5 h-5 ltr:mr-2 rtl:ml-2 text-neutral-500" />{" "}
                          {t("scheduling_type")}
                        </label>
                      </div>
                      <Controller
                        name="schedulingType"
                        control={formMethods.control}
                        defaultValue={eventType.schedulingType}
                        render={() => (
                          <RadioArea.Select
                            value={asStringOrUndefined(eventType.schedulingType)}
                            options={schedulingTypeOptions}
                            onChange={(val) => {
                              // FIXME
                              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                              // @ts-ignore
                              formMethods.setValue("schedulingType", val);
                            }}
                          />
                        )}
                      />
                    </div>

                    <div className="block sm:flex">
                      <div className="mb-4 min-w-48 sm:mb-0">
                        <label htmlFor="users" className="flex text-sm font-medium text-neutral-700">
                          <UserAddIcon className="w-5 h-5 ltr:mr-2 rtl:ml-2 text-neutral-500" />{" "}
                          {t("attendees")}
                        </label>
                      </div>
                      <div className="w-full space-y-2">
                        <Controller
                          name="users"
                          control={formMethods.control}
                          defaultValue={eventType.users.map((user) => user.id.toString())}
                          render={() => (
                            <CheckedSelect
                              disabled={false}
                              onChange={(options) => {
                                formMethods.setValue(
                                  "users",
                                  options.map((user) => user.value)
                                );
                              }}
                              defaultValue={eventType.users.map(mapUserToValue)}
                              options={teamMembers.map(mapUserToValue)}
                              placeholder={t("add_attendees")}
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <Collapsible
                  open={advancedSettingsVisible}
                  onOpenChange={() => setAdvancedSettingsVisible(!advancedSettingsVisible)}>
                  <>
                    <CollapsibleTrigger type="button" className="flex w-full">
                      <ChevronRightIcon
                        className={`${
                          advancedSettingsVisible ? "transform rotate-90" : ""
                        } w-5 h-5 text-neutral-500 ml-auto`}
                      />
                      <span className="text-sm font-medium text-neutral-700">
                        {t("show_advanced_settings")}
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-6">
                      {/**
                       * Only display calendar selector if user has connected calendars AND if it's not
                       * a team event. Since we don't have logic to handle each attende calendar (for now).
                       * This will fallback to each user selected destination calendar.
                       */}
                      {!!connectedCalendarsQuery.data?.connectedCalendars.length && !team && (
                        <div className="items-center block sm:flex">
                          <div className="mb-4 min-w-48 sm:mb-0">
                            <label htmlFor="eventName" className="flex text-sm font-medium text-neutral-700">
                              Create events on:
                            </label>
                          </div>
                          <div className="w-full">
                            <div className="relative mt-1 rounded-sm shadow-sm">
                              <Controller
                                control={formMethods.control}
                                name="destinationCalendar"
                                defaultValue={eventType.destinationCalendar || undefined}
                                render={({ field: { onChange, value } }) => (
                                  <DestinationCalendarSelector
                                    value={value ? value.externalId : undefined}
                                    onChange={onChange}
                                    hidePlaceholder
                                  />
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="items-center block sm:flex">
                        <div className="mb-4 min-w-48 sm:mb-0">
                          <label htmlFor="eventName" className="flex text-sm font-medium text-neutral-700">
                            {t("event_name")} <InfoBadge content={t("event_name_tooltip")} />
                          </label>
                        </div>
                        <div className="w-full">
                          <div className="relative mt-1 rounded-sm shadow-sm">
                            <input
                              type="text"
                              className="block w-full border-gray-300 rounded-sm shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                              placeholder={t("meeting_with_user")}
                              defaultValue={eventType.eventName || ""}
                              {...formMethods.register("eventName")}
                            />
                          </div>
                        </div>
                      </div>
                      {eventType.isWeb3Active && (
                        <div className="items-center block sm:flex">
                          <div className="mb-4 min-w-48 sm:mb-0">
                            <label
                              htmlFor="smartContractAddress"
                              className="flex text-sm font-medium text-neutral-700">
                              {t("Smart Contract Address")}
                            </label>
                          </div>
                          <div className="w-full">
                            <div className="relative mt-1 rounded-sm shadow-sm">
                              {
                                <input
                                  type="text"
                                  className="block w-full border-gray-300 rounded-sm shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                  placeholder={t("Example: 0x71c7656ec7ab88b098defb751b7401b5f6d8976f")}
                                  defaultValue={(eventType.metadata.smartContractAddress || "") as string}
                                  {...formMethods.register("smartContractAddress")}
                                />
                              }
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="items-center block sm:flex">
                        <div className="mb-4 min-w-48 sm:mb-0">
                          <label
                            htmlFor="additionalFields"
                            className="mt-2 text-sm font-medium flexflex text-neutral-700">
                            {t("additional_inputs")}
                          </label>
                        </div>
                        <div className="w-full">
                          <ul className="mt-1">
                            {customInputs.map((customInput: EventTypeCustomInput, idx: number) => (
                              <li key={idx} className="p-2 mb-2 border bg-secondary-50">
                                <div className="flex justify-between">
                                  <div className="flex-1 w-0">
                                    <div className="truncate">
                                      <span
                                        className="ltr:ml-2 rtl:mr-2text-sm"
                                        title={`${t("label")}: ${customInput.label}`}>
                                        {t("label")}: {customInput.label}
                                      </span>
                                    </div>
                                    {customInput.placeholder && (
                                      <div className="truncate">
                                        <span
                                          className="ltr:ml-2 rtl:mr-2text-sm"
                                          title={`${t("placeholder")}: ${customInput.placeholder}`}>
                                          {t("placeholder")}: {customInput.placeholder}
                                        </span>
                                      </div>
                                    )}
                                    <div>
                                      <span className="ltr:ml-2 rtl:mr-2text-sm">
                                        {t("type")}: {customInput.type}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="ltr:ml-2 rtl:mr-2text-sm">
                                        {customInput.required ? t("required") : t("optional")}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex">
                                    <Button
                                      onClick={() => {
                                        setSelectedCustomInput(customInput);
                                        setSelectedCustomInputModalOpen(true);
                                      }}
                                      color="minimal"
                                      type="button">
                                      {t("edit")}
                                    </Button>
                                    <button type="button" onClick={() => removeCustom(idx)}>
                                      <XIcon className="w-6 h-6 pl-1 border-l-2 hover:text-red-500 " />
                                    </button>
                                  </div>
                                </div>
                              </li>
                            ))}
                            <li>
                              <Button
                                onClick={() => {
                                  setSelectedCustomInput(undefined);
                                  setSelectedCustomInputModalOpen(true);
                                }}
                                color="secondary"
                                type="button"
                                StartIcon={PlusIcon}>
                                {t("add_input")}
                              </Button>
                            </li>
                          </ul>
                        </div>
                      </div>

                      <Controller
                        name="requiresConfirmation"
                        control={formMethods.control}
                        defaultValue={eventType.requiresConfirmation}
                        render={() => (
                          <CheckboxField
                            id="requiresConfirmation"
                            name="requiresConfirmation"
                            label={t("opt_in_booking")}
                            description={t("opt_in_booking_description")}
                            defaultChecked={eventType.requiresConfirmation}
                            onChange={(e) => {
                              formMethods.setValue("requiresConfirmation", e?.target.checked);
                            }}
                          />
                        )}
                      />

                      <Controller
                        name="disableGuests"
                        control={formMethods.control}
                        defaultValue={eventType.disableGuests}
                        render={() => (
                          <CheckboxField
                            id="disableGuests"
                            name="disableGuests"
                            label={t("disable_guests")}
                            description={t("disable_guests_description")}
                            defaultChecked={eventType.disableGuests}
                            onChange={(e) => {
                              formMethods.setValue("disableGuests", e?.target.checked);
                            }}
                          />
                        )}
                      />

                      <hr className="my-2 border-neutral-200" />
                      <Controller
                        name="minimumBookingNotice"
                        control={formMethods.control}
                        defaultValue={eventType.minimumBookingNotice}
                        render={() => (
                          <MinutesField
                            label={t("minimum_booking_notice")}
                            required
                            min="0"
                            placeholder="120"
                            defaultValue={eventType.minimumBookingNotice}
                            onChange={(e) => {
                              formMethods.setValue("minimumBookingNotice", Number(e.target.value));
                            }}
                          />
                        )}
                      />

                      <div className="items-center block sm:flex">
                        <div className="mb-4 min-w-48 sm:mb-0">
                          <label htmlFor="eventName" className="flex text-sm font-medium text-neutral-700">
                            {t("slot_interval")}
                          </label>
                        </div>
                        <div className="w-full">
                          <div className="relative mt-1 rounded-sm shadow-sm">
                            <Controller
                              name="slotInterval"
                              control={formMethods.control}
                              render={() => {
                                const slotIntervalOptions = [
                                  {
                                    label: t("slot_interval_default"),
                                    value: -1,
                                  },
                                  ...[5, 10, 15, 20, 30, 45, 60].map((minutes) => ({
                                    label: minutes + " " + t("minutes"),
                                    value: minutes,
                                  })),
                                ];
                                return (
                                  <Select
                                    isSearchable={false}
                                    classNamePrefix="react-select"
                                    className="flex-1 block w-full min-w-0 border border-gray-300 rounded-sm react-select-container focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                    onChange={(val) => {
                                      formMethods.setValue(
                                        "slotInterval",
                                        val && (val.value || 0) > 0 ? val.value : null
                                      );
                                    }}
                                    defaultValue={
                                      slotIntervalOptions.find(
                                        (option) => option.value === eventType.slotInterval
                                      ) || slotIntervalOptions[0]
                                    }
                                    options={slotIntervalOptions}
                                  />
                                );
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="block sm:flex">
                        <div className="mb-4 min-w-48 sm:mb-0">
                          <label
                            htmlFor="inviteesCanSchedule"
                            className="flex text-sm font-medium text-neutral-700 mt-2.5">
                            {t("invitees_can_schedule")}
                          </label>
                        </div>
                        <div className="w-full">
                          <Controller
                            name="periodType"
                            control={formMethods.control}
                            defaultValue={periodType?.type}
                            render={() => (
                              <RadioGroup.Root
                                defaultValue={periodType?.type}
                                onValueChange={(val) =>
                                  formMethods.setValue("periodType", val as PeriodType)
                                }>
                                {PERIOD_TYPES.map((period) => (
                                  <div className="flex items-center mb-2 text-sm" key={period.type}>
                                    <RadioGroup.Item
                                      id={period.type}
                                      value={period.type}
                                      className="flex items-center w-4 h-4 bg-white border border-black rounded-full cursor-pointer ltr:mr-2 rtl:ml-2 focus:border-2 focus:outline-none">
                                      <RadioGroup.Indicator className="relative flex items-center justify-center w-4 h-4 after:bg-black after:block after:w-2 after:h-2 after:rounded-full" />
                                    </RadioGroup.Item>
                                    {period.prefix ? <span>{period.prefix}&nbsp;</span> : null}
                                    {period.type === "ROLLING" && (
                                      <div className="inline-flex">
                                        <input
                                          type="number"
                                          className="block w-12 ltr:mr-2 rtl:ml-2 border-gray-300 rounded-sm shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm [appearance:textfield]"
                                          placeholder="30"
                                          {...formMethods.register("periodDays", { valueAsNumber: true })}
                                          defaultValue={eventType.periodDays || 30}
                                        />
                                        <select
                                          id=""
                                          className="block w-full py-2 pl-3 pr-10 text-base border-gray-300 rounded-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                          {...formMethods.register("periodCountCalendarDays")}
                                          defaultValue={eventType.periodCountCalendarDays ? "1" : "0"}>
                                          <option value="1">{t("calendar_days")}</option>
                                          <option value="0">{t("business_days")}</option>
                                        </select>
                                      </div>
                                    )}
                                    {period.type === "RANGE" && (
                                      <div className="inline-flex space-x-2 rtl:space-x-reverse ltr:ml-2 rtl:mr-2">
                                        <Controller
                                          name="periodDates"
                                          control={formMethods.control}
                                          defaultValue={periodDates}
                                          render={() => (
                                            <DateRangePicker
                                              startDate={formMethods.getValues("periodDates").startDate}
                                              endDate={formMethods.getValues("periodDates").endDate}
                                              onDatesChange={({ startDate, endDate }) => {
                                                formMethods.setValue("periodDates", { startDate, endDate });
                                              }}
                                            />
                                          )}
                                        />
                                      </div>
                                    )}
                                    {period.suffix ? (
                                      <span className="ltr:ml-2 rtl:mr-2">&nbsp;{period.suffix}</span>
                                    ) : null}
                                  </div>
                                ))}
                              </RadioGroup.Root>
                            )}
                          />
                        </div>
                      </div>

                      <hr className="border-neutral-200" />

                      <div className="block sm:flex">
                        <div className="mb-4 min-w-48 sm:mb-0">
                          <label htmlFor="availability" className="flex text-sm font-medium text-neutral-700">
                            {t("availability")}
                          </label>
                        </div>
                        <div className="w-full">
                          <Controller
                            name="availability"
                            control={formMethods.control}
                            render={() => (
                              <Scheduler
                                setAvailability={(val) => {
                                  formMethods.setValue("availability", {
                                    openingHours: val.openingHours,
                                    dateOverrides: val.dateOverrides,
                                  });
                                }}
                                setTimeZone={(timeZone) => {
                                  formMethods.setValue("timeZone", timeZone);
                                  setSelectedTimeZone(timeZone);
                                }}
                                timeZone={selectedTimeZone}
                                availability={availability.map((schedule) => ({
                                  ...schedule,
                                  startTime: new Date(schedule.startTime),
                                  endTime: new Date(schedule.endTime),
                                }))}
                              />
                            )}
                          />
                        </div>
                      </div>

                      {hasPaymentIntegration && (
                        <>
                          <hr className="border-neutral-200" />
                          <div className="block sm:flex">
                            <div className="mb-4 min-w-48 sm:mb-0">
                              <label
                                htmlFor="payment"
                                className="flex mt-2 text-sm font-medium text-neutral-700">
                                {t("payment")}
                              </label>
                            </div>

                            <div className="flex flex-col">
                              <div className="w-full">
                                <div className="items-center block sm:flex">
                                  <div className="w-full">
                                    <div className="relative flex items-start">
                                      <div className="flex items-center h-5">
                                        <input
                                          onChange={(event) => {
                                            setRequirePayment(event.target.checked);
                                            if (!event.target.checked) {
                                              formMethods.setValue("price", 0);
                                            }
                                          }}
                                          id="requirePayment"
                                          name="requirePayment"
                                          type="checkbox"
                                          className="w-4 h-4 border-gray-300 rounded focus:ring-primary-500 text-primary-600"
                                          defaultChecked={requirePayment}
                                        />
                                      </div>
                                      <div className="text-sm ltr:ml-3 rtl:mr-3">
                                        <p className="text-neutral-900">
                                          {t("require_payment")} (0.5% +{" "}
                                          <IntlProvider locale="en">
                                            <FormattedNumber
                                              value={0.1}
                                              style="currency"
                                              currency={currency}
                                            />
                                          </IntlProvider>{" "}
                                          {t("commission_per_transaction")})
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {requirePayment && (
                                <div className="w-full">
                                  <div className="items-center block sm:flex">
                                    <div className="w-full">
                                      <div className="relative mt-1 rounded-sm shadow-sm">
                                        <Controller
                                          defaultValue={eventType.price}
                                          control={formMethods.control}
                                          name="price"
                                          render={({ field }) => (
                                            <input
                                              {...field}
                                              step="0.01"
                                              min="0.5"
                                              type="number"
                                              required
                                              className="block w-full pl-2 pr-12 border-gray-300 rounded-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                              placeholder="Price"
                                              onChange={(e) => {
                                                field.onChange(e.target.valueAsNumber * 100);
                                              }}
                                              value={field.value > 0 ? field.value / 100 : 0}
                                            />
                                          )}
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                          <span className="text-gray-500 sm:text-sm" id="duration">
                                            {new Intl.NumberFormat("en", {
                                              style: "currency",
                                              currency: currency,
                                              maximumSignificantDigits: 1,
                                              maximumFractionDigits: 0,
                                            })
                                              .format(0)
                                              .replace("0", "")}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </CollapsibleContent>
                  </>
                  {/* )} */}
                </Collapsible>
                <div className="flex justify-end mt-4 space-x-2 rtl:space-x-reverse">
                  <Button href="/event-types" color="secondary" tabIndex={-1}>
                    {t("cancel")}
                  </Button>
                  <Button type="submit" disabled={updateMutation.isLoading}>
                    {t("update")}
                  </Button>
                </div>
              </Form>
            </div>
          </div>
          <div className="w-full px-2 mt-8 ltr:ml-2 rtl:mr-2 sm:w-3/12 sm:mt-0 min-w-[177px] ">
            <div className="px-2">
              <Controller
                name="hidden"
                control={formMethods.control}
                defaultValue={eventType.hidden}
                render={({ field }) => (
                  <Switch
                    defaultChecked={field.value}
                    onCheckedChange={(isChecked) => {
                      formMethods.setValue("hidden", isChecked);
                    }}
                    label={t("hide_event_type")}
                  />
                )}
              />
            </div>
            <div className="mt-4 space-y-1.5">
              <a
                href={permalink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center px-2 py-1 text-sm font-medium rounded-sm text-md text-neutral-700 hover:text-gray-900 hover:bg-gray-200">
                <ExternalLinkIcon className="w-4 h-4 ltr:mr-2 rtl:ml-2 text-neutral-500" aria-hidden="true" />
                {t("preview")}
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(permalink);
                  showToast("Link copied!", "success");
                }}
                type="button"
                className="flex items-center px-2 py-1 text-sm font-medium text-gray-700 rounded-sm text-md hover:text-gray-900 hover:bg-gray-200">
                <LinkIcon className="w-4 h-4 ltr:mr-2 rtl:ml-2 text-neutral-500" />
                {t("copy_link")}
              </button>
              <Dialog>
                <DialogTrigger className="flex items-center px-2 py-1 text-sm font-medium rounded-sm text-md text-neutral-700 hover:text-gray-900 hover:bg-gray-200">
                  <TrashIcon className="w-4 h-4 ltr:mr-2 rtl:ml-2 text-neutral-500" />
                  {t("delete")}
                </DialogTrigger>
                <ConfirmationDialogContent
                  variety="danger"
                  title={t("delete_event_type")}
                  confirmBtnText={t("confirm_delete_event_type")}
                  onConfirm={deleteEventTypeHandler}>
                  {t("delete_event_type_description")}
                </ConfirmationDialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        <Controller
          name="customInputs"
          control={formMethods.control}
          defaultValue={eventType.customInputs.sort((a, b) => a.id - b.id) || []}
          render={() => (
            <Dialog open={selectedCustomInputModalOpen} onOpenChange={setSelectedCustomInputModalOpen}>
              <DialogContent asChild>
                <div className="inline-block px-4 pt-5 pb-4 text-left align-bottom transition-all transform bg-white rounded-sm shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                  <div className="mb-4 sm:flex sm:items-start">
                    <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto rounded-full bg-secondary-100 sm:mx-0 sm:h-10 sm:w-10">
                      <PlusIcon className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                        {t("add_new_custom_input_field")}
                      </h3>
                      <div>
                        <p className="text-sm text-gray-400">
                          {t("this_input_will_shown_booking_this_event")}
                        </p>
                      </div>
                    </div>
                  </div>
                  <CustomInputTypeForm
                    selectedCustomInput={selectedCustomInput}
                    onSubmit={(values) => {
                      const customInput: EventTypeCustomInput = {
                        id: -1,
                        eventTypeId: -1,
                        label: values.label,
                        placeholder: values.placeholder,
                        required: values.required,
                        type: values.type,
                      };

                      if (selectedCustomInput) {
                        selectedCustomInput.label = customInput.label;
                        selectedCustomInput.placeholder = customInput.placeholder;
                        selectedCustomInput.required = customInput.required;
                        selectedCustomInput.type = customInput.type;
                      } else {
                        setCustomInputs(customInputs.concat(customInput));
                        formMethods.setValue(
                          "customInputs",
                          formMethods.getValues("customInputs").concat(customInput)
                        );
                      }
                      setSelectedCustomInputModalOpen(false);
                    }}
                    onCancel={() => {
                      setSelectedCustomInputModalOpen(false);
                    }}
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}
        />
      </Shell>
    </div>
  );
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, query } = context;
  const session = await getSession({ req });
  const typeParam = parseInt(asStringOrThrow(query.type));

  if (!session?.user?.id) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }

  const userSelect = Prisma.validator<Prisma.UserSelect>()({
    name: true,
    username: true,
    id: true,
    avatar: true,
    email: true,
  });

  const rawEventType = await prisma.eventType.findFirst({
    where: {
      AND: [
        {
          OR: [
            {
              users: {
                some: {
                  id: session.user.id,
                },
              },
            },
            {
              team: {
                members: {
                  some: {
                    userId: session.user.id,
                  },
                },
              },
            },
            {
              userId: session.user.id,
            },
          ],
        },
        {
          id: typeParam,
        },
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      hidden: true,
      locations: true,
      eventName: true,
      availability: true,
      customInputs: true,
      timeZone: true,
      periodType: true,
      metadata: true,
      periodDays: true,
      periodStartDate: true,
      periodEndDate: true,
      periodCountCalendarDays: true,
      requiresConfirmation: true,
      disableGuests: true,
      minimumBookingNotice: true,
      slotInterval: true,
      team: {
        select: {
          slug: true,
          members: {
            where: {
              accepted: true,
            },
            select: {
              user: {
                select: userSelect,
              },
            },
          },
        },
      },
      users: {
        select: userSelect,
      },
      schedulingType: true,
      userId: true,
      price: true,
      currency: true,
      destinationCalendar: true,
    },
  });

  if (!rawEventType) throw Error("Event type not found");

  type Location = {
    type: LocationType;
    address?: string;
  };

  const credentials = await prisma.credential.findMany({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
      type: true,
      key: true,
    },
  });

  const web3Credentials = credentials.find((credential) => credential.type.includes("_web3"));
  const { locations, metadata, ...restEventType } = rawEventType;
  const eventType = {
    ...restEventType,
    locations: locations as unknown as Location[],
    metadata: (metadata || {}) as JSONObject,
    isWeb3Active:
      web3Credentials && web3Credentials.key
        ? (((web3Credentials.key as JSONObject).isWeb3Active || false) as boolean)
        : false,
  };

  // backwards compat
  if (eventType.users.length === 0 && !eventType.team) {
    const fallbackUser = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: userSelect,
    });
    if (!fallbackUser) throw Error("The event type doesn't have user and no fallback user was found");
    eventType.users.push(fallbackUser);
  }

  const integrations = getIntegrations(credentials);

  const locationOptions: OptionTypeBase[] = [];

  if (hasIntegration(integrations, "zoom_video")) {
    locationOptions.push({ value: LocationType.Zoom, label: "Zoom Video", disabled: true });
  }
  const hasPaymentIntegration = hasIntegration(integrations, "stripe_payment");
  if (hasIntegration(integrations, "google_calendar")) {
    locationOptions.push({ value: LocationType.GoogleMeet, label: "Google Meet" });
  }
  if (hasIntegration(integrations, "daily_video")) {
    locationOptions.push({ value: LocationType.Daily, label: "Daily.co Video" });
  }
  if (hasIntegration(integrations, "huddle01_video")) {
    locationOptions.push({ value: LocationType.Huddle01, label: "Huddle01 Video" });
  }
  if (hasIntegration(integrations, "tandem_video")) {
    locationOptions.push({ value: LocationType.Tandem, label: "Tandem Video" });
  }
  const currency =
    (credentials.find((integration) => integration.type === "stripe_payment")?.key as unknown as StripeData)
      ?.default_currency || "usd";

  if (hasIntegration(integrations, "office365_calendar")) {
    // TODO: Add default meeting option of the office integration.
    // Assuming it's Microsoft Teams.
  }

  type Availability = typeof eventType["availability"];
  const getAvailability = (availability: Availability) =>
    availability?.length
      ? availability.map((schedule) => ({
          ...schedule,
          startTime: new Date(new Date().toDateString() + " " + schedule.startTime.toTimeString()).valueOf(),
          endTime: new Date(new Date().toDateString() + " " + schedule.endTime.toTimeString()).valueOf(),
        }))
      : null;

  const availability = getAvailability(eventType.availability) || [];
  availability.sort((a, b) => a.startTime - b.startTime);

  const eventTypeObject = Object.assign({}, eventType, {
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
    availability,
  });

  const teamMembers = eventTypeObject.team
    ? eventTypeObject.team.members.map((member) => {
        const user = member.user;
        user.avatar = user.avatar || defaultAvatarSrc({ email: asStringOrUndefined(user.email) });
        return user;
      })
    : [];

  return {
    props: {
      session,
      eventType: eventTypeObject,
      locationOptions,
      availability,
      team: eventTypeObject.team || null,
      teamMembers,
      hasPaymentIntegration,
      currency,
    },
  };
};

export default EventTypePage;
