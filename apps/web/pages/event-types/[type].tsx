import { zodResolver } from "@hookform/resolvers/zod";
import { EventTypeCustomInput, MembershipRole, PeriodType, Prisma, SchedulingType } from "@prisma/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import * as RadioGroup from "@radix-ui/react-radio-group";
import classNames from "classnames";
import { isValidPhoneNumber } from "libphonenumber-js";
import { GetServerSidePropsContext } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { Controller, Noop, useForm, UseFormReturn } from "react-hook-form";
import { FormattedNumber, IntlProvider } from "react-intl";
import short from "short-uuid";
import { JSONObject } from "superjson/dist/types";
import { v5 as uuidv5 } from "uuid";
import { z } from "zod";

import { SelectGifInput } from "@calcom/app-store/giphy/components";
import { EventLocationType, getEventLocationType } from "@calcom/app-store/locations";
import { StripeData } from "@calcom/app-store/stripepayment/lib/server";
import getApps, { getLocationOptions } from "@calcom/app-store/utils";
import { LocationObject } from "@calcom/core/location";
import { parseRecurringEvent } from "@calcom/lib";
import { CAL_URL, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import prisma from "@calcom/prisma";
import { trpc } from "@calcom/trpc/react";
import type { RecurringEvent } from "@calcom/types/Calendar";
import { Alert } from "@calcom/ui/Alert";
import Badge from "@calcom/ui/Badge";
import Button from "@calcom/ui/Button";
import ConfirmationDialogContent from "@calcom/ui/ConfirmationDialogContent";
import { Dialog, DialogContent, DialogTrigger } from "@calcom/ui/Dialog";
import { Icon } from "@calcom/ui/Icon";
import Shell from "@calcom/ui/Shell";
import Switch from "@calcom/ui/Switch";
import { Tooltip } from "@calcom/ui/Tooltip";
import { Form } from "@calcom/ui/form/fields";

import { QueryCell } from "@lib/QueryCell";
import { asStringOrThrow, asStringOrUndefined } from "@lib/asStringOrNull";
import { getSession } from "@lib/auth";
import { HttpError } from "@lib/core/http/error";
import { slugify } from "@lib/slugify";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import { ClientSuspense } from "@components/ClientSuspense";
import DestinationCalendarSelector from "@components/DestinationCalendarSelector";
import { EmbedButton, EmbedDialog } from "@components/Embed";
import Loader from "@components/Loader";
import { AvailabilitySelectSkeletonLoader } from "@components/availability/SkeletonLoader";
import { EditLocationDialog } from "@components/dialog/EditLocationDialog";
import RecurringEventController from "@components/eventtype/RecurringEventController";
import CustomInputTypeForm from "@components/pages/eventtypes/CustomInputTypeForm";
import EditableHeading from "@components/ui/EditableHeading";
import InfoBadge from "@components/ui/InfoBadge";
import CheckboxField from "@components/ui/form/CheckboxField";
import CheckedSelect from "@components/ui/form/CheckedSelect";
import { DateRangePicker } from "@components/ui/form/DateRangePicker";
import MinutesField from "@components/ui/form/MinutesField";
import Select from "@components/ui/form/Select";
import * as RadioArea from "@components/ui/form/radio-area";
import WebhookListContainer from "@components/webhook/WebhookListContainer";

import { getTranslation } from "@server/lib/i18n";
import { TRPCClientError } from "@trpc/client";

const RainbowInstallForm = dynamic(() => import("@calcom/rainbow/components/RainbowInstallForm"), {
  suspense: true,
});

type OptionTypeBase = {
  label: string;
  value: EventLocationType["type"];
  disabled?: boolean;
};

export type FormValues = {
  title: string;
  eventTitle: string;
  eventName: string;
  slug: string;
  length: number;
  description: string;
  disableGuests: boolean;
  requiresConfirmation: boolean;
  recurringEvent: RecurringEvent | null;
  schedulingType: SchedulingType | null;
  price: number;
  currency: string;
  hidden: boolean;
  hideCalendarNotes: boolean;
  hashedLink: string | undefined;
  locations: {
    type: EventLocationType["type"];
    address?: string;
    link?: string;
    phone?: string;
    hostPhoneNumber?: string;
    displayLocationPublicly?: boolean;
  }[];
  customInputs: EventTypeCustomInput[];
  users: string[];
  schedule: number;
  periodType: PeriodType;
  periodDays: number;
  periodCountCalendarDays: "1" | "0";
  periodDates: { startDate: Date; endDate: Date };
  seatsPerTimeSlot: number | null;
  minimumBookingNotice: number;
  beforeBufferTime: number;
  afterBufferTime: number;
  slotInterval: number | null;
  destinationCalendar: {
    integration: string;
    externalId: string;
  };
  successRedirectUrl: string;
  giphyThankYouPage: string;
  blockchainId: number;
  smartContractAddress: string;
};

const SuccessRedirectEdit = <T extends UseFormReturn<FormValues>>({
  eventType,
  formMethods,
}: {
  eventType: inferSSRProps<typeof getServerSideProps>["eventType"];
  formMethods: T;
}) => {
  const { t } = useLocale();

  return (
    <>
      <hr className="border-neutral-200" />
      <div className="block sm:flex">
        <div className="min-w-48 sm:mb-0">
          <label
            htmlFor="successRedirectUrl"
            className="flex h-full items-center text-sm font-medium text-neutral-700">
            {t("redirect_success_booking")}
          </label>
        </div>
        <div className="w-full">
          <input
            id="successRedirectUrl"
            readOnly={eventType.team !== undefined}
            type="url"
            className="block w-full rounded-sm border-gray-300 text-sm"
            placeholder={t("external_redirect_url")}
            defaultValue={eventType.successRedirectUrl || ""}
            {...formMethods.register("successRedirectUrl")}
          />
        </div>
      </div>
    </>
  );
};

type AvailabilityOption = {
  label: string;
  value: number;
};

const AvailabilitySelect = ({
  className = "",
  ...props
}: {
  className?: string;
  name: string;
  value: number;
  onBlur: Noop;
  onChange: (value: AvailabilityOption | null) => void;
}) => {
  const query = trpc.useQuery(["viewer.availability.list"]);

  return (
    <QueryCell
      query={query}
      customLoader={<AvailabilitySelectSkeletonLoader />}
      success={({ data }) => {
        const options = data.schedules.map((schedule) => ({
          value: schedule.id,
          label: schedule.name,
        }));

        const value = options.find((option) =>
          props.value
            ? option.value === props.value
            : option.value === data.schedules.find((schedule) => schedule.isDefault)?.id
        );
        return (
          <Select
            options={options}
            isSearchable={false}
            onChange={props.onChange}
            className={classNames("block w-full min-w-0 flex-1 rounded-sm text-sm", className)}
            value={value}
          />
        );
      }}
    />
  );
};

const EventTypePage = (props: inferSSRProps<typeof getServerSideProps>) => {
  const { t } = useLocale();

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
  const {
    eventType,
    locationOptions,
    team,
    teamMembers,
    hasPaymentIntegration,
    currency,
    hasGiphyIntegration,
    hasRainbowIntegration,
  } = props;
  const router = useRouter();

  const updateMutation = trpc.useMutation("viewer.eventTypes.update", {
    onSuccess: async ({ eventType }) => {
      await router.push("/event-types");
      showToast(
        t("event_type_updated_successfully", {
          eventTypeTitle: eventType.title,
        }),
        "success"
      );
    },
    onError: (err) => {
      let message = "";
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        message = `${err.data.code}: You are not able to update this event`;
      }

      if (err.data?.code === "PARSE_ERROR") {
        message = `${err.data.code}: ${err.message}`;
      }

      if (message) {
        showToast(message, "error");
      }
      showToast("Some error occurred", "error");
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
      } else if (err instanceof TRPCClientError) {
        showToast(err.message, "error");
      }
    },
  });
  const connectedCalendarsQuery = trpc.useQuery(["viewer.connectedCalendars"]);

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<OptionTypeBase | undefined>(undefined);
  const [selectedCustomInput, setSelectedCustomInput] = useState<EventTypeCustomInput | undefined>(undefined);
  const [selectedCustomInputModalOpen, setSelectedCustomInputModalOpen] = useState(false);
  const [customInputs, setCustomInputs] = useState<EventTypeCustomInput[]>(
    eventType.customInputs.sort((a, b) => a.id - b.id) || []
  );

  const defaultSeatsPro = 6;
  const minSeats = 2;
  const [enableSeats, setEnableSeats] = useState(!!eventType.seatsPerTimeSlot);

  const [displayNameTips, setDisplayNameTips] = useState(false);
  const periodType =
    PERIOD_TYPES.find((s) => s.type === eventType.periodType) ||
    PERIOD_TYPES.find((s) => s.type === "UNLIMITED");

  const [advancedSettingsVisible, setAdvancedSettingsVisible] = useState(false);

  const [requirePayment, setRequirePayment] = useState(eventType.price > 0);
  const [recurringEventDefined, setRecurringEventDefined] = useState(
    eventType.recurringEvent?.count !== undefined
  );

  const [hashedLinkVisible, setHashedLinkVisible] = useState(!!eventType.hashedLink);
  const [hashedUrl, setHashedUrl] = useState(eventType.hashedLink?.link);

  const generateHashedLink = (id: number) => {
    const translator = short();
    const seed = `${id}:${new Date().getTime()}`;
    const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));
    return uid;
  };

  useEffect(() => {
    !hashedUrl && setHashedUrl(generateHashedLink(eventType.users[0]?.id ?? team?.id));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function deleteEventTypeHandler(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    event.preventDefault();
    const payload = { id: eventType.id };
    deleteMutation.mutate(payload);
  }

  const openLocationModal = (type: EventLocationType["type"]) => {
    setSelectedLocation(locationOptions.find((option) => option.value === type));
    setShowLocationModal(true);
  };

  const removeLocation = (selectedLocation: typeof eventType.locations[number]) => {
    formMethods.setValue(
      "locations",
      formMethods.getValues("locations").filter((location) => location.type !== selectedLocation.type),
      { shouldValidate: true }
    );
  };

  const addLocation = (newLocationType: EventLocationType["type"], details = {}) => {
    const existingIdx = formMethods.getValues("locations").findIndex((loc) => newLocationType === loc.type);
    if (existingIdx !== -1) {
      const copy = formMethods.getValues("locations");
      copy[existingIdx] = {
        ...formMethods.getValues("locations")[existingIdx],
        ...details,
      };
      formMethods.setValue("locations", copy);
    } else {
      formMethods.setValue(
        "locations",
        formMethods.getValues("locations").concat({ type: newLocationType, ...details })
      );
    }
    setShowLocationModal(false);
  };

  const removeCustom = (index: number) => {
    formMethods.getValues("customInputs").splice(index, 1);
    customInputs.splice(index, 1);
    setCustomInputs([...customInputs]);
  };

  const schedulingTypeOptions: {
    value: SchedulingType;
    label: string;
    description: string;
  }[] = [
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

  const [periodDates] = useState<{ startDate: Date; endDate: Date }>({
    startDate: new Date(eventType.periodStartDate || Date.now()),
    endDate: new Date(eventType.periodEndDate || Date.now()),
  });

  const embedLink = `${team ? `team/${team.slug}` : eventType.users[0].username}/${eventType.slug}`;
  const permalink = `${CAL_URL}/${embedLink}`;

  const placeholderHashedLink = `${CAL_URL}/d/${hashedUrl}/${eventType.slug}`;

  const mapUserToValue = ({
    id,
    name,
    username,
  }: {
    id: number | null;
    name: string | null;
    username: string | null;
  }) => ({
    value: `${id || ""}`,
    label: `${name || ""}`,
    avatar: `${WEBAPP_URL}/${username}/avatar.png`,
  });

  const formMethods = useForm<FormValues>({
    defaultValues: {
      title: eventType.title,
      locations: eventType.locations || [],
      recurringEvent: eventType.recurringEvent || null,
      schedule: eventType.schedule?.id,
      periodDates: {
        startDate: periodDates.startDate,
        endDate: periodDates.endDate,
      },
    },
  });

  const locationFormSchema = z.object({
    locationType: z.string(),
    locationAddress: z.string().optional(),
    displayLocationPublicly: z.boolean().optional(),
    locationPhoneNumber: z
      .string()
      .refine((val) => isValidPhoneNumber(val))
      .optional(),
    locationLink: z.string().url().optional(), // URL validates as new URL() - which requires HTTPS:// In the input field
  });

  const locationFormMethods = useForm<{
    locationType: EventLocationType["type"];
    locationPhoneNumber?: string;
    locationAddress?: string; // TODO: We should validate address or fetch the address from googles api to see if its valid?
    locationLink?: string; // Currently this only accepts links that are HTTPS://
    displayLocationPublicly?: boolean;
  }>({
    resolver: zodResolver(locationFormSchema),
  });
  const Locations = () => {
    const { t } = useLocale();
    return (
      <div className="w-full">
        {formMethods.getValues("locations").length === 0 && (
          <div className="flex">
            <Select
              options={locationOptions}
              isSearchable
              className="block w-full min-w-0 flex-1 rounded-sm text-sm"
              onChange={(e) => {
                if (e?.value) {
                  const newLocationType: EventLocationType["type"] = e.value;
                  const eventLocationType = getEventLocationType(newLocationType);
                  if (!eventLocationType) {
                    return;
                  }
                  locationFormMethods.setValue("locationType", newLocationType);
                  if (eventLocationType.organizerInputType) {
                    openLocationModal(newLocationType);
                  } else {
                    addLocation(newLocationType);
                  }
                }
              }}
            />
          </div>
        )}

        {formMethods.getValues("locations").length > 0 && (
          <ul>
            {formMethods.getValues("locations").map((location, index) => {
              const eventLocation = getEventLocationType(location.type);
              if (!eventLocation) {
                // It's possible that the location app in use got uninstalled.
                return null;
              }
              return (
                <li key={location.type} className="mb-2 rounded-sm border border-neutral-300 py-1.5 px-2">
                  <div className="flex justify-between">
                    <div key={index} className="flex flex-grow items-center">
                      <img
                        src={eventLocation.iconUrl}
                        className="h-6 w-6"
                        alt={`${eventLocation.label} logo`}
                      />
                      <span className="break-all text-sm ltr:ml-2 rtl:mr-2">
                        {location[eventLocation.defaultValueVariable] || eventLocation.label}
                      </span>
                    </div>
                    <div className="flex">
                      <button
                        type="button"
                        onClick={() => {
                          locationFormMethods.setValue("locationType", location.type);
                          locationFormMethods.unregister("locationLink");
                          locationFormMethods.unregister("locationAddress");
                          locationFormMethods.unregister("locationPhoneNumber");
                          openLocationModal(location.type);
                        }}
                        aria-label={t("edit")}
                        className="mr-1 p-1 text-gray-500 hover:text-gray-900">
                        <Icon.FiEdit2 className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => removeLocation(location)} aria-label={t("remove")}>
                        <Icon.FiX className="border-l-1 h-6 w-6 pl-1 text-gray-500 hover:text-gray-900 " />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
            {formMethods.getValues("locations").length > 0 &&
              formMethods.getValues("locations").length !== locationOptions.length && (
                <li>
                  <button
                    type="button"
                    className="flex rounded-sm py-2 hover:bg-gray-100"
                    onClick={() => setShowLocationModal(true)}>
                    <Icon.FiPlus className="mt-0.5 h-4 w-4 text-neutral-900" />
                    <span className="ml-1 text-sm font-medium text-neutral-700">{t("add_location")}</span>
                  </button>
                </li>
              )}
          </ul>
        )}
      </div>
    );
  };

  const membership = team?.members.find((membership) => membership.user.id === props.session.user.id);
  const isAdmin = membership?.role === MembershipRole.OWNER || membership?.role === MembershipRole.ADMIN;
  return (
    <div>
      <Shell
        title={t("event_type_title", { eventTypeTitle: eventType.title })}
        heading={
          <EditableHeading
            title={formMethods.watch("title")}
            onChange={(value) => formMethods.setValue("title", value)}
          />
        }
        subtitle={eventType.description || ""}>
        <ClientSuspense fallback={<Loader />}>
          <div className="flex flex-col-reverse lg:flex-row">
            <div className="w-full max-w-4xl ltr:mr-2 rtl:ml-2 lg:w-9/12">
              <div className="-mx-4 rounded-sm border border-neutral-200 bg-white p-4 py-6 sm:mx-0 sm:px-8">
                <Form
                  form={formMethods}
                  handleSubmit={async (values) => {
                    const {
                      periodDates,
                      periodCountCalendarDays,
                      smartContractAddress,
                      blockchainId,
                      giphyThankYouPage,
                      beforeBufferTime,
                      afterBufferTime,
                      seatsPerTimeSlot,
                      recurringEvent,
                      locations,
                      ...input
                    } = values;

                    updateMutation.mutate({
                      ...input,
                      locations,
                      recurringEvent,
                      periodStartDate: periodDates.startDate,
                      periodEndDate: periodDates.endDate,
                      periodCountCalendarDays: periodCountCalendarDays === "1",
                      id: eventType.id,
                      beforeEventBuffer: beforeBufferTime,
                      afterEventBuffer: afterBufferTime,
                      seatsPerTimeSlot: Number.isNaN(seatsPerTimeSlot) ? null : seatsPerTimeSlot,
                      metadata: {
                        ...(smartContractAddress ? { smartContractAddress } : {}),
                        ...(blockchainId ? { blockchainId } : { blockchainId: 1 }),
                        ...(giphyThankYouPage ? { giphyThankYouPage } : {}),
                      },
                    });
                  }}
                  className="space-y-6">
                  <div className="space-y-3">
                    <div className="block items-center sm:flex">
                      <div className="min-w-48 mb-4 sm:mb-0">
                        <label
                          id="slug-label"
                          htmlFor="slug"
                          className="flex text-sm font-medium text-neutral-700">
                          <Icon.FiLink className="mt-0.5 h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2" />
                          {t("url")}
                        </label>
                      </div>
                      <div className="w-full">
                        <div className="flex rounded-sm">
                          <span className="inline-flex items-center rounded-l-sm border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                            {CAL_URL?.replace(/^(https?:|)\/\//, "")}/
                            {team ? "team/" + team.slug : eventType.users[0].username}/
                          </span>
                          <input
                            type="text"
                            id="slug"
                            aria-labelledby="slug-label"
                            required
                            className="block w-full min-w-0 flex-1 rounded-none rounded-r-sm border-gray-300 text-sm"
                            defaultValue={eventType.slug}
                            {...formMethods.register("slug", {
                              setValueAs: (v) => slugify(v),
                            })}
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
                              <Icon.FiClock className="h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2" />{" "}
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
                        <label
                          htmlFor="location"
                          className="mt-2.5 flex text-sm font-medium text-neutral-700">
                          <Icon.FiMapPin className="mt-0.5 mb-4 h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2" />
                          {t("location")}
                        </label>
                      </div>
                      <Controller
                        name="locations"
                        control={formMethods.control}
                        defaultValue={eventType.locations || []}
                        render={() => <Locations />}
                      />
                    </div>
                  </div>
                  <hr className="border-neutral-200" />
                  <div className="space-y-3">
                    <div className="block sm:flex">
                      <div className="min-w-48 mb-4 mt-2.5 sm:mb-0">
                        <label
                          htmlFor="description"
                          className="mt-0 flex text-sm font-medium text-neutral-700">
                          <Icon.FiFileText className="mt-0.5 h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2" />
                          {t("description")}
                        </label>
                      </div>
                      <div className="w-full">
                        <textarea
                          id="description"
                          className="block w-full rounded-sm border-gray-300 text-sm "
                          placeholder={t("quick_video_meeting")}
                          {...formMethods.register("description")}
                          defaultValue={asStringOrUndefined(eventType.description)}
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="border-neutral-200" />
                  <div className="space-y-3">
                    <div className="block sm:flex">
                      <div className="min-w-48 mb-4 mt-2.5 sm:mb-0">
                        <label
                          htmlFor="availability"
                          className="mt-0 flex text-sm font-medium text-neutral-700">
                          <Icon.FiClock className="mt-0.5 h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2" />
                          {t("availability")} <InfoBadge content={t("you_can_manage_your_schedules")} />
                        </label>
                      </div>
                      <Controller
                        name="schedule"
                        control={formMethods.control}
                        render={({ field }) => (
                          <AvailabilitySelect
                            value={field.value}
                            onBlur={field.onBlur}
                            name={field.name}
                            onChange={(selected) => field.onChange(selected?.value || null)}
                          />
                        )}
                      />
                    </div>
                  </div>

                  {team && <hr className="border-neutral-200" />}
                  {team && (
                    <div className="space-y-3">
                      <div className="block sm:flex">
                        <div className="min-w-48 mb-4 sm:mb-0">
                          <label
                            htmlFor="schedulingType"
                            className="mt-2 flex text-sm font-medium text-neutral-700">
                            <Icon.FiUsers className="h-5 w-5 text-neutral-500 ltr:mr-2 rtl:ml-2" />{" "}
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
                                // FIXME: Better types are needed
                                formMethods.setValue("schedulingType", val as SchedulingType);
                              }}
                            />
                          )}
                        />
                      </div>

                      <div className="block sm:flex">
                        <div className="min-w-48 mb-4 sm:mb-0">
                          <label htmlFor="users" className="flex text-sm font-medium text-neutral-700">
                            <Icon.FiUserPlus className="h-5 w-5 text-neutral-500 ltr:mr-2 rtl:ml-2" />{" "}
                            {t("attendees")}
                          </label>
                        </div>
                        <div className="w-full space-y-2">
                          <Controller
                            name="users"
                            control={formMethods.control}
                            defaultValue={eventType.users.map((user) => user.id.toString())}
                            render={({ field: { onChange, value } }) => (
                              <CheckedSelect
                                isDisabled={false}
                                onChange={(options) => onChange(options.map((user) => user.value))}
                                value={value
                                  .map(
                                    (userId) =>
                                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                      teamMembers
                                        .map(mapUserToValue)
                                        .find((member) => member.value === userId)!
                                  )
                                  .filter(Boolean)}
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
                      <CollapsibleTrigger
                        type="button"
                        data-testid="show-advanced-settings"
                        className="flex w-full">
                        <Icon.FiChevronRight
                          className={`${
                            advancedSettingsVisible ? "rotate-90 transform" : ""
                          } ml-auto h-5 w-5 text-neutral-500`}
                        />
                        <span className="text-sm font-medium text-neutral-700">
                          {t("show_advanced_settings")}
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent data-testid="advanced-settings-content" className="mt-4 space-y-6">
                        {/**
                         * Only display calendar selector if user has connected calendars AND if it's not
                         * a team event. Since we don't have logic to handle each attende calendar (for now).
                         * This will fallback to each user selected destination calendar.
                         */}
                        {!!connectedCalendarsQuery.data?.connectedCalendars.length && !team && (
                          <div className="block items-center sm:flex">
                            <div className="min-w-48 mb-4 sm:mb-0">
                              <label
                                htmlFor="createEventsOn"
                                className="flex text-sm font-medium text-neutral-700">
                                {t("create_events_on")}:
                              </label>
                            </div>
                            <div className="w-full">
                              <div className="relative mt-1 rounded-sm">
                                <Controller
                                  control={formMethods.control}
                                  name="destinationCalendar"
                                  defaultValue={eventType.destinationCalendar || undefined}
                                  render={({ field: { onChange, value } }) => (
                                    <DestinationCalendarSelector
                                      destinationCalendar={connectedCalendarsQuery.data?.destinationCalendar}
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
                        <div className="block items-center sm:flex">
                          <div className="min-w-48 mb-4 sm:mb-0">
                            <label htmlFor="eventName" className="flex text-sm font-medium text-neutral-700">
                              {t("event_name")} <InfoBadge content={t("event_name_tooltip")} />
                            </label>
                          </div>
                          <div className="w-full">
                            <div className="relative mt-1 rounded-sm">
                              <input
                                type="text"
                                className="block w-full rounded-sm border-gray-300 text-sm "
                                placeholder={t("meeting_with_user")}
                                defaultValue={eventType.eventName || ""}
                                onFocus={() => setDisplayNameTips(true)}
                                {...formMethods.register("eventName")}
                              />
                              {displayNameTips && (
                                <div className="mt-1 text-gray-500">
                                  <p>{`{HOST} = ${t("your_name")}`}</p>
                                  <p>{`{ATTENDEE} = ${t("attendee_name")}`}</p>
                                  <p>{`{HOST/ATTENDEE} = ${t(
                                    "dynamically_display_attendee_or_organizer"
                                  )}`}</p>
                                  <p>{`{LOCATION} = ${t("event_location")}`}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="block items-center sm:flex">
                          <div className="min-w-48 mb-4 sm:mb-0">
                            <label
                              htmlFor="additionalFields"
                              className="flexflex mt-2 text-sm font-medium text-neutral-700">
                              {t("additional_inputs")}
                            </label>
                          </div>
                          <div className="w-full">
                            <ul className="mt-1">
                              {customInputs.map((customInput: EventTypeCustomInput, idx: number) => (
                                <li key={idx} className="bg-secondary-50 mb-2 border p-2">
                                  <div className="flex justify-between">
                                    <div className="w-0 flex-1">
                                      <div className="truncate">
                                        <span
                                          className="text-sm ltr:ml-2 rtl:mr-2"
                                          title={`${t("label")}: ${customInput.label}`}>
                                          {t("label")}: {customInput.label}
                                        </span>
                                      </div>
                                      {customInput.placeholder && (
                                        <div className="truncate">
                                          <span
                                            className="text-sm ltr:ml-2 rtl:mr-2"
                                            title={`${t("placeholder")}: ${customInput.placeholder}`}>
                                            {t("placeholder")}: {customInput.placeholder}
                                          </span>
                                        </div>
                                      )}
                                      <div>
                                        <span className="text-sm ltr:ml-2 rtl:mr-2">
                                          {t("type")}: {customInput.type}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-sm ltr:ml-2 rtl:mr-2">
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
                                        <Icon.FiX className="h-6 w-6 border-l-2 pl-1 hover:text-red-500 " />
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
                                  StartIcon={Icon.FiPlus}>
                                  {t("add_input")}
                                </Button>
                              </li>
                            </ul>
                          </div>
                        </div>

                        <Controller
                          name="hideCalendarNotes"
                          control={formMethods.control}
                          defaultValue={eventType.hideCalendarNotes}
                          render={() => (
                            <CheckboxField
                              id="hideCalendarNotes"
                              descriptionAsLabel
                              name="hideCalendarNotes"
                              label={t("disable_notes")}
                              description={t("disable_notes_description")}
                              defaultChecked={eventType.hideCalendarNotes}
                              onChange={(e) => {
                                formMethods.setValue("hideCalendarNotes", e?.target.checked);
                              }}
                            />
                          )}
                        />

                        <Controller
                          name="requiresConfirmation"
                          defaultValue={eventType.requiresConfirmation}
                          render={({ field: { value, onChange } }) => (
                            <CheckboxField
                              id="requiresConfirmation"
                              descriptionAsLabel
                              name="requiresConfirmation"
                              label={t("requires_confirmation")}
                              description={t("requires_confirmation_description")}
                              defaultChecked={eventType.requiresConfirmation}
                              disabled={enableSeats}
                              checked={value}
                              onChange={(e) => onChange(e?.target.checked)}
                            />
                          )}
                        />

                        <RecurringEventController
                          paymentEnabled={hasPaymentIntegration && requirePayment}
                          onRecurringEventDefined={setRecurringEventDefined}
                          recurringEvent={eventType.recurringEvent}
                          formMethods={formMethods}
                        />

                        <Controller
                          name="disableGuests"
                          control={formMethods.control}
                          defaultValue={eventType.disableGuests}
                          render={() => (
                            <CheckboxField
                              id="disableGuests"
                              name="disableGuests"
                              descriptionAsLabel
                              label={t("disable_guests")}
                              description={t("disable_guests_description")}
                              defaultChecked={eventType.disableGuests}
                              // If we have seats per booking then we need to disable guests
                              disabled={enableSeats}
                              checked={formMethods.watch("disableGuests")}
                              onChange={(e) => {
                                formMethods.setValue("disableGuests", e?.target.checked);
                              }}
                            />
                          )}
                        />

                        <Controller
                          name="hashedLink"
                          control={formMethods.control}
                          defaultValue={hashedUrl}
                          render={() => (
                            <>
                              <CheckboxField
                                id="hashedLinkCheck"
                                name="hashedLinkCheck"
                                descriptionAsLabel
                                label={t("private_link")}
                                description={t("private_link_description")}
                                defaultChecked={eventType.hashedLink ? true : false}
                                onChange={(e) => {
                                  setHashedLinkVisible(e?.target.checked);
                                  formMethods.setValue(
                                    "hashedLink",
                                    e?.target.checked ? hashedUrl : undefined
                                  );
                                }}
                              />
                              {hashedLinkVisible && (
                                <div className="!mt-1 block items-center sm:flex">
                                  <div className="min-w-48 mb-4 sm:mb-0" />
                                  <div className="w-full">
                                    <div className="relative mt-1 flex w-full">
                                      <input
                                        disabled
                                        name="hashedLink"
                                        data-testid="generated-hash-url"
                                        type="text"
                                        className="grow select-none border-gray-300 bg-gray-50 text-sm text-gray-500 ltr:rounded-l-sm rtl:rounded-r-sm"
                                        defaultValue={placeholderHashedLink}
                                      />
                                      <Tooltip
                                        content={
                                          eventType.hashedLink
                                            ? t("copy_to_clipboard")
                                            : t("enabled_after_update")
                                        }>
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
                                          type="button"
                                          className="text-md flex items-center border border-gray-300 px-2 py-1 text-sm font-medium text-gray-700 ltr:rounded-r-sm ltr:border-l-0 rtl:rounded-l-sm rtl:border-r-0">
                                          <Icon.FiCopy className="w-6 p-1 text-neutral-500" />
                                        </Button>
                                      </Tooltip>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      The URL will regenerate after each use
                                    </span>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        />

                        {hasRainbowIntegration && (
                          <RainbowInstallForm
                            formMethods={formMethods}
                            blockchainId={(eventType.metadata.blockchainId as number) || 1}
                            smartContractAddress={(eventType.metadata.smartContractAddress as string) || ""}
                          />
                        )}

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

                        <div className="block items-center sm:flex">
                          <div className="min-w-48 mb-4 sm:mb-0">
                            <label htmlFor="eventName" className="flex text-sm font-medium text-neutral-700">
                              {t("slot_interval")}
                            </label>
                          </div>
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
                                  className="block w-full min-w-0 flex-1 rounded-sm text-sm"
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
                        <hr className="my-2 border-neutral-200" />

                        <fieldset className="block sm:flex">
                          <div className="min-w-48 mb-4 sm:mb-0">
                            <label
                              htmlFor="inviteesCanSchedule"
                              className="mt-2.5 flex text-sm font-medium text-neutral-700">
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
                                    <div className="mb-2 flex items-center text-sm" key={period.type}>
                                      <RadioGroup.Item
                                        id={period.type}
                                        value={period.type}
                                        className="min-w-4 flex h-4 w-4 cursor-pointer items-center rounded-full border border-black bg-white focus:border-2 focus:outline-none ltr:mr-2 rtl:ml-2">
                                        <RadioGroup.Indicator className="relative flex h-4 w-4 items-center justify-center after:block after:h-2 after:w-2 after:rounded-full after:bg-black" />
                                      </RadioGroup.Item>
                                      {period.prefix ? <span>{period.prefix}&nbsp;</span> : null}
                                      {period.type === "ROLLING" && (
                                        <div className="inline-flex">
                                          <input
                                            type="number"
                                            className="block w-16 rounded-sm border-gray-300 text-sm [appearance:textfield] ltr:mr-2 rtl:ml-2"
                                            placeholder="30"
                                            {...formMethods.register("periodDays", { valueAsNumber: true })}
                                            defaultValue={eventType.periodDays || 30}
                                          />
                                          <select
                                            id=""
                                            className="block w-full rounded-sm border-gray-300 py-2 pl-3 pr-10 text-sm focus:outline-none"
                                            {...formMethods.register("periodCountCalendarDays")}
                                            defaultValue={eventType.periodCountCalendarDays ? "1" : "0"}>
                                            <option value="1">{t("calendar_days")}</option>
                                            <option value="0">{t("business_days")}</option>
                                          </select>
                                        </div>
                                      )}
                                      {period.type === "RANGE" && (
                                        <div className="inline-flex space-x-2 ltr:ml-2 rtl:mr-2 rtl:space-x-reverse">
                                          <Controller
                                            name="periodDates"
                                            control={formMethods.control}
                                            defaultValue={periodDates}
                                            render={() => (
                                              <DateRangePicker
                                                startDate={formMethods.getValues("periodDates").startDate}
                                                endDate={formMethods.getValues("periodDates").endDate}
                                                onDatesChange={({ startDate, endDate }) => {
                                                  formMethods.setValue("periodDates", {
                                                    startDate,
                                                    endDate,
                                                  });
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
                        </fieldset>
                        <hr className="border-neutral-200" />
                        <div className="block sm:flex">
                          <div className="min-w-48 mb-4 sm:mb-0">
                            <label
                              htmlFor="bufferTime"
                              className="mt-2.5 flex text-sm font-medium text-neutral-700">
                              {t("buffer_time")}
                            </label>
                          </div>
                          <div className="w-full">
                            <div className="inline-flex w-full space-x-2">
                              <div className="w-full">
                                <label
                                  htmlFor="beforeBufferTime"
                                  className="mb-2 flex text-sm font-medium text-neutral-700">
                                  {t("before_event")}
                                </label>
                                <Controller
                                  name="beforeBufferTime"
                                  control={formMethods.control}
                                  defaultValue={eventType.beforeEventBuffer || 0}
                                  render={({ field: { onChange, value } }) => {
                                    const beforeBufferOptions = [
                                      {
                                        label: t("event_buffer_default"),
                                        value: 0,
                                      },
                                      ...[5, 10, 15, 20, 30, 45, 60].map((minutes) => ({
                                        label: minutes + " " + t("minutes"),
                                        value: minutes,
                                      })),
                                    ];
                                    return (
                                      <Select
                                        isSearchable={false}
                                        className="block w-full min-w-0 flex-1 rounded-sm text-sm"
                                        onChange={(val) => {
                                          if (val) onChange(val.value);
                                        }}
                                        defaultValue={
                                          beforeBufferOptions.find((option) => option.value === value) ||
                                          beforeBufferOptions[0]
                                        }
                                        options={beforeBufferOptions}
                                      />
                                    );
                                  }}
                                />
                              </div>
                              <div className="w-full">
                                <label
                                  htmlFor="afterBufferTime"
                                  className="mb-2 flex text-sm font-medium text-neutral-700">
                                  {t("after_event")}
                                </label>
                                <Controller
                                  name="afterBufferTime"
                                  control={formMethods.control}
                                  defaultValue={eventType.afterEventBuffer || 0}
                                  render={({ field: { onChange, value } }) => {
                                    const afterBufferOptions = [
                                      {
                                        label: t("event_buffer_default"),
                                        value: 0,
                                      },
                                      ...[5, 10, 15, 20, 30, 45, 60].map((minutes) => ({
                                        label: minutes + " " + t("minutes"),
                                        value: minutes,
                                      })),
                                    ];
                                    return (
                                      <Select
                                        isSearchable={false}
                                        className="block w-full min-w-0 flex-1 rounded-sm text-sm"
                                        onChange={(val) => {
                                          if (val) onChange(val.value);
                                        }}
                                        defaultValue={
                                          afterBufferOptions.find((option) => option.value === value) ||
                                          afterBufferOptions[0]
                                        }
                                        options={afterBufferOptions}
                                      />
                                    );
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <>
                          <hr className="border-neutral-200" />
                          <div className="block flex-col sm:flex">
                            <Controller
                              name="seatsPerTimeSlot"
                              control={formMethods.control}
                              render={() => (
                                <CheckboxField
                                  id="seats"
                                  name="seats"
                                  descriptionAsLabel
                                  label={t("offer_seats")}
                                  description={t("offer_seats_description")}
                                  defaultChecked={!!eventType.seatsPerTimeSlot}
                                  onChange={(e) => {
                                    if (e?.target.checked) {
                                      setEnableSeats(true);
                                      // Want to disable individuals from taking multiple seats
                                      formMethods.setValue("seatsPerTimeSlot", defaultSeatsPro);
                                      formMethods.setValue("disableGuests", true);
                                      formMethods.setValue("requiresConfirmation", false);
                                    } else {
                                      setEnableSeats(false);
                                      formMethods.setValue("seatsPerTimeSlot", null);
                                      formMethods.setValue(
                                        "requiresConfirmation",
                                        eventType.requiresConfirmation
                                      );
                                      formMethods.setValue("disableGuests", eventType.disableGuests);
                                    }
                                  }}
                                />
                              )}
                            />

                            {enableSeats && (
                              <div className="block sm:flex">
                                <div className="mt-2 inline-flex w-full space-x-2 md:ml-48">
                                  <div className="w-full">
                                    <Controller
                                      name="seatsPerTimeSlot"
                                      control={formMethods.control}
                                      render={() => {
                                        const selectSeatsPerTimeSlotOptions = [
                                          { value: 2, label: "2" },
                                          { value: 3, label: "3" },
                                          { value: 4, label: "4" },
                                          { value: 5, label: "5" },
                                          {
                                            value: -1,
                                            isDisabled: !eventType.users.some(
                                              (user) => user.plan === ("PRO" || "TRIAL")
                                            ),
                                            label: (
                                              <div className="flex flex-row justify-between">
                                                <span>6+</span>
                                                <Badge variant="default">PRO</Badge>
                                              </div>
                                            ) as unknown as string,
                                          },
                                        ];
                                        return (
                                          <>
                                            <div className="block sm:flex">
                                              <div className="flex-auto">
                                                {eventType.users.some((user) =>
                                                  ["PRO", "TRIAL"].includes(user.plan)
                                                ) ? (
                                                  <div className="flex-auto">
                                                    <label
                                                      htmlFor="beforeBufferTime"
                                                      className="mb-2 flex text-sm font-medium text-neutral-700">
                                                      {t("enter_number_of_seats")}
                                                    </label>
                                                    <input
                                                      type="number"
                                                      className="focus:border-primary-500 focus:ring-primary-500 py- block  w-20 rounded-sm border-gray-300 text-sm [appearance:textfield] ltr:mr-2 rtl:ml-2"
                                                      placeholder={`${defaultSeatsPro}`}
                                                      min={minSeats}
                                                      {...formMethods.register("seatsPerTimeSlot", {
                                                        valueAsNumber: true,
                                                      })}
                                                      defaultValue={
                                                        eventType.seatsPerTimeSlot || defaultSeatsPro
                                                      }
                                                    />
                                                  </div>
                                                ) : (
                                                  <>
                                                    <label
                                                      htmlFor="beforeBufferTime"
                                                      className="mb-2 flex text-sm font-medium text-neutral-700">
                                                      {t("number_of_seats")}
                                                    </label>
                                                    <Select
                                                      isSearchable={false}
                                                      classNamePrefix="react-select"
                                                      className="react-select-container focus:border-primary-500 focus:ring-primary-500 block w-full min-w-0 flex-auto rounded-sm border border-gray-300 text-sm "
                                                      onChange={(val) => {
                                                        if (!val) {
                                                          return;
                                                        }
                                                        if (val.value === -1) {
                                                          formMethods.setValue("seatsPerTimeSlot", minSeats);
                                                        } else {
                                                          formMethods.setValue("seatsPerTimeSlot", val.value);
                                                        }
                                                      }}
                                                      defaultValue={{
                                                        value: eventType.seatsPerTimeSlot || minSeats,
                                                        label: `${eventType.seatsPerTimeSlot || minSeats}`,
                                                      }}
                                                      options={selectSeatsPerTimeSlotOptions}
                                                    />
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                          </>
                                        );
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </>

                        <SuccessRedirectEdit<typeof formMethods>
                          formMethods={formMethods}
                          eventType={eventType}
                        />
                        {hasPaymentIntegration && (
                          <>
                            <hr className="border-neutral-200" />
                            <div className="block sm:flex">
                              <div className="min-w-48 mb-4 sm:mb-0">
                                <label
                                  htmlFor="payment"
                                  className="mt-2 flex text-sm font-medium text-neutral-700">
                                  {t("payment")}
                                </label>
                              </div>

                              <div className="flex flex-col">
                                <div className="w-full">
                                  {recurringEventDefined ? (
                                    <Alert severity="warning" title={t("warning_recurring_event_payment")} />
                                  ) : (
                                    <div className="block items-center sm:flex">
                                      <div className="w-full">
                                        <div className="relative flex items-start">
                                          <div className="flex h-5 items-center">
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
                                              className="text-primary-600 h-4 w-4 rounded border-gray-300"
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
                                  )}
                                </div>
                                {requirePayment && (
                                  <div className="w-full">
                                    <div className="block items-center sm:flex">
                                      <div className="w-full">
                                        <div className="relative mt-1 rounded-sm">
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
                                                className="block w-full rounded-sm border-gray-300 pl-2 pr-12 text-sm"
                                                placeholder="Price"
                                                onChange={(e) => {
                                                  field.onChange(e.target.valueAsNumber * 100);
                                                }}
                                                value={field.value > 0 ? field.value / 100 : undefined}
                                              />
                                            )}
                                          />
                                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                            <span className="text-sm text-gray-500" id="duration">
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
                        {hasGiphyIntegration && (
                          <>
                            <hr className="border-neutral-200" />
                            <div className="block sm:flex">
                              <div className="min-w-48 mb-4 sm:mb-0">
                                <label
                                  htmlFor="gif"
                                  className="mt-2 flex text-sm font-medium text-neutral-700">
                                  {t("confirmation_page_gif")}
                                </label>
                              </div>

                              <div className="flex flex-col">
                                <div className="w-full">
                                  <div className="block items-center sm:flex">
                                    <div className="w-full">
                                      <div className="relative flex items-start">
                                        <div className="flex items-center">
                                          <SelectGifInput
                                            defaultValue={eventType?.metadata?.giphyThankYouPage as string}
                                            onChange={(url) => {
                                              formMethods.setValue("giphyThankYouPage", url);
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </CollapsibleContent>
                    </>
                    {/* )} */}
                  </Collapsible>
                  <div className="mt-4 flex justify-end space-x-2 rtl:space-x-reverse">
                    <Button href="/event-types" color="secondary" tabIndex={-1}>
                      {t("cancel")}
                    </Button>
                    <Button type="submit" data-testid="update-eventtype" disabled={updateMutation.isLoading}>
                      {t("update")}
                    </Button>
                  </div>
                </Form>
              </div>
            </div>
            <div className="m-0 mt-0 mb-4 w-full lg:w-3/12 lg:px-2 lg:ltr:ml-2 lg:rtl:mr-2">
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
                  className="text-md inline-flex items-center rounded-sm px-2 py-1 text-sm font-medium text-neutral-700 hover:bg-gray-200 hover:text-gray-900">
                  <Icon.FiExternalLink
                    className="h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2"
                    aria-hidden="true"
                  />
                  {t("preview")}
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(permalink);
                    showToast("Link copied!", "success");
                  }}
                  type="button"
                  className="text-md flex items-center rounded-sm px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900">
                  <Icon.FiLink className="h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2" />
                  {t("copy_link")}
                </button>
                {hashedLinkVisible && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(placeholderHashedLink);
                      if (eventType.hashedLink) {
                        showToast(t("private_link_copied"), "success");
                      } else {
                        showToast(t("enabled_after_update_description"), "warning");
                      }
                    }}
                    type="button"
                    className="text-md flex items-center rounded-sm px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900">
                    <Icon.FiLink className="h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2" />
                    {t("copy_private_link")}
                  </button>
                )}
                <EmbedButton
                  as="button"
                  type="button"
                  className="text-md flex items-center rounded-sm px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                  embedUrl={encodeURIComponent(embedLink)}>
                  <Icon.FiCode className="h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2" aria-hidden="true" />
                  {t("embed")}
                </EmbedButton>
                {/* This will only show if the user is not a member (ADMIN,OWNER) and if there is no current membership
                      - meaning you are within an eventtype that does not belong to a team */}
                {(props.currentUserMembership?.role !== "MEMBER" || !props.currentUserMembership) && (
                  <Dialog>
                    <DialogTrigger className="text-md flex items-center rounded-sm px-2 py-1 text-sm font-medium text-red-500 hover:bg-gray-200">
                      <Icon.FiTrash className="h-4 w-4 text-red-500 ltr:mr-2 rtl:ml-2" />
                      {t("delete")}
                    </DialogTrigger>
                    <ConfirmationDialogContent
                      isLoading={deleteMutation.isLoading}
                      variety="danger"
                      title={t("delete_event_type")}
                      confirmBtnText={t("confirm_delete_event_type")}
                      onConfirm={deleteEventTypeHandler}>
                      {t("delete_event_type_description")}
                    </ConfirmationDialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </div>
          <EditLocationDialog
            isOpenDialog={showLocationModal}
            setShowLocationModal={setShowLocationModal}
            saveLocation={addLocation}
            defaultValues={formMethods.getValues("locations")}
            selection={
              selectedLocation ? { value: selectedLocation.value, label: selectedLocation.label } : undefined
            }
            setSelectedLocation={setSelectedLocation}
          />
          <Controller
            name="customInputs"
            control={formMethods.control}
            defaultValue={eventType.customInputs.sort((a, b) => a.id - b.id) || []}
            render={() => (
              <Dialog open={selectedCustomInputModalOpen} onOpenChange={setSelectedCustomInputModalOpen}>
                <DialogContent asChild>
                  <div className="inline-block transform rounded-sm bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
                    <div className="mb-4 sm:flex sm:items-start">
                      <div className="bg-secondary-100 mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10">
                        <Icon.FiPlus className="text-primary-600 h-6 w-6" />
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
          {isAdmin && (
            <WebhookListContainer
              title={t("team_webhooks")}
              subtitle={t("receive_cal_event_meeting_data")}
              eventTypeId={props.eventType.id}
            />
          )}
        </ClientSuspense>
        <EmbedDialog />
      </Shell>
    </div>
  );
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, query } = context;
  const session = await getSession({ req });
  const typeParam = parseInt(asStringOrThrow(query.type));

  if (Number.isNaN(typeParam)) {
    return {
      notFound: true,
    };
  }

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
    plan: true,
    locale: true,
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
      recurringEvent: true,
      hideCalendarNotes: true,
      disableGuests: true,
      minimumBookingNotice: true,
      beforeEventBuffer: true,
      afterEventBuffer: true,
      slotInterval: true,
      hashedLink: true,
      successRedirectUrl: true,
      team: {
        select: {
          id: true,
          slug: true,
          members: {
            where: {
              accepted: true,
            },
            select: {
              role: true,
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
      schedule: {
        select: {
          id: true,
        },
      },
      userId: true,
      price: true,
      currency: true,
      destinationCalendar: true,
      seatsPerTimeSlot: true,
    },
  });

  if (!rawEventType) {
    return {
      notFound: true,
    };
  }

  const credentials = await prisma.credential.findMany({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
      type: true,
      key: true,
      userId: true,
      appId: true,
    },
  });

  const { locations, metadata, ...restEventType } = rawEventType;
  const eventType = {
    ...restEventType,
    recurringEvent: parseRecurringEvent(restEventType.recurringEvent),
    locations: locations as unknown as LocationObject[],
    metadata: (metadata || {}) as JSONObject,
  };

  const hasGiphyIntegration = !!credentials.find((credential) => credential.type === "giphy_other");
  const hasRainbowIntegration = !!credentials.find((credential) => credential.type === "rainbow_web3");

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
  const currentUser = eventType.users.find((u) => u.id === session.user.id);
  const t = await getTranslation(currentUser?.locale ?? "en", "common");
  const integrations = getApps(credentials);
  const locationOptions = getLocationOptions(integrations, t);
  const hasPaymentIntegration = !!credentials.find((credential) => credential.type === "stripe_payment");
  const currency =
    (credentials.find((integration) => integration.type === "stripe_payment")?.key as unknown as StripeData)
      ?.default_currency || "usd";

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
        user.avatar = `${CAL_URL}/${user.username}/avatar.png`;
        return user;
      })
    : [];

  // Find the current users memebership so we can check role to enable/disable deletion.
  // Sets to null if no membership is found - this must mean we are in a none team event type
  const currentUserMembership =
    eventTypeObject.team?.members.find((el) => el.user.id === session.user.id) ?? null;

  return {
    props: {
      session,
      eventType: eventTypeObject,
      locationOptions,
      availability,
      team: eventTypeObject.team || null,
      teamMembers,
      hasPaymentIntegration,
      hasGiphyIntegration,
      hasRainbowIntegration,
      currency,
      currentUserMembership,
    },
  };
};

export default EventTypePage;
