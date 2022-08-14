import { zodResolver } from "@hookform/resolvers/zod";
import { EventTypeCustomInput, MembershipRole, PeriodType, Prisma, SchedulingType } from "@prisma/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import * as RadioGroup from "@radix-ui/react-radio-group";
import classNames from "classnames";
import { isValidPhoneNumber } from "libphonenumber-js";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { Controller, Noop, useForm, UseFormReturn } from "react-hook-form";
import { FormattedNumber, IntlProvider } from "react-intl";
import short from "short-uuid";
import { JSONObject } from "superjson/dist/types";
import { v5 as uuidv5 } from "uuid";
import { z } from "zod";

import { SelectGifInput } from "@calcom/app-store/giphy/components";
import { StripeData } from "@calcom/app-store/stripepayment/lib/server";
import getApps, { getLocationOptions } from "@calcom/app-store/utils";
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
import { isSuccessRedirectAvailable } from "@lib/isSuccessRedirectAvailable";
import { LocationObject, LocationType } from "@lib/location";
import { slugify } from "@lib/slugify";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import { ClientSuspense } from "@components/ClientSuspense";
import DestinationCalendarSelector from "@components/DestinationCalendarSelector";
import { EmbedButton, EmbedDialog } from "@components/Embed";
import Loader from "@components/Loader";
import { UpgradeToProDialog } from "@components/UpgradeToProDialog";
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

type OptionTypeBase = {
  label: string;
  value: LocationType;
  disabled?: boolean;
};

export type FormValues = {
  title: string;
  eventTitle: string;
  smartContractAddress: string;
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
    type: LocationType;
    address?: string;
    link?: string;
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
};

const SuccessRedirectEdit = <T extends UseFormReturn<FormValues>>({
  eventType,
  formMethods,
}: {
  eventType: inferSSRProps<typeof getServerSideProps>["eventType"];
  formMethods: T;
}) => {
  const { t } = useLocale();
  const proUpgradeRequired = !isSuccessRedirectAvailable(eventType);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <hr className="border-neutral-200" />
      <div className="block sm:flex">
        <div className="min-w-48 sm:mb-0">
          <label
            htmlFor="successRedirectUrl"
            className="flex h-full items-center text-sm font-medium text-neutral-700">
            {t("redirect_success_booking")}
            <span className="ml-1">{proUpgradeRequired && <Badge variant="default">PRO</Badge>}</span>
          </label>
        </div>
        <div className="w-full">
          <input
            id="successRedirectUrl"
            onClick={(e) => {
              if (proUpgradeRequired) {
                e.preventDefault();
                setModalOpen(true);
              }
            }}
            readOnly={proUpgradeRequired}
            type="url"
            className="block w-full rounded-sm border-gray-300 text-sm"
            placeholder={t("external_redirect_url")}
            defaultValue={eventType.successRedirectUrl || ""}
            {...formMethods.register("successRedirectUrl")}
          />
        </div>
        <UpgradeToProDialog modalOpen={modalOpen} setModalOpen={setModalOpen}>
          {t("redirect_url_upgrade_description")}
        </UpgradeToProDialog>
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

  const openLocationModal = (type: LocationType) => {
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

  const addLocation = (newLocationType: LocationType, details = {}) => {
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
    locationType: LocationType;
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
              isSearchable={false}
              className="block w-full min-w-0 flex-1 rounded-sm text-sm"
              onChange={(e) => {
                if (e?.value) {
                  const newLocationType: LocationType = e.value;
                  locationFormMethods.setValue("locationType", newLocationType);
                  if (
                    newLocationType === LocationType.InPerson ||
                    newLocationType === LocationType.Link ||
                    newLocationType === LocationType.UserPhone ||
                    newLocationType === LocationType.Whereby ||
                    newLocationType === LocationType.Around ||
                    newLocationType === LocationType.Riverside ||
                    newLocationType === LocationType.Ping
                  ) {
                    openLocationModal(newLocationType);
                  } else {
                    addLocation(newLocationType);
                  }
                }
              }}
            />
          </div>
        )}

        {/* TODO: all of this should be generated from the App Store */}
        {formMethods.getValues("locations").length > 0 && (
          <ul>
            {formMethods.getValues("locations").map((location) => (
              <li key={location.type} className="mb-2 rounded-sm border border-neutral-300 py-1.5 px-2">
                <div className="flex justify-between">
                  {location.type === LocationType.InPerson && (
                    <div className="flex flex-grow items-center">
                      <Icon.FiMapPin className="h-6 w-6" />
                      <span className="w-full border-0 bg-transparent text-sm ltr:ml-2 rtl:mr-2">
                        {location.address}
                      </span>
                    </div>
                  )}
                  {location.type === LocationType.Link && (
                    <div className="flex flex-grow items-center">
                      <Icon.FiGlobe className="h-6 w-6" />
                      <span className="w-full border-0 bg-transparent text-sm ltr:ml-2 rtl:mr-2">
                        {location.link}
                      </span>
                    </div>
                  )}
                  {location.type === LocationType.UserPhone && (
                    <div className="flex flex-grow items-center">
                      <Icon.FiPhone className="h-6 w-6" />
                      <span className="w-full border-0 bg-transparent text-sm ltr:ml-2 rtl:mr-2">
                        {location.hostPhoneNumber}
                      </span>
                    </div>
                  )}
                  {location.type === LocationType.Phone && (
                    <div className="flex flex-grow items-center">
                      <Icon.FiPhone className="h-6 w-6" />
                      <span className="text-sm ltr:ml-2 rtl:mr-2">{t("phone_call")}</span>
                    </div>
                  )}
                  {location.type === LocationType.Whereby && (
                    <div className="flex flex-grow items-center">
                      <img src="/api/app-store/whereby/icon.svg" className="h-6 w-6" alt="Whereby logo" />
                      <span className="text-sm ltr:ml-2 rtl:mr-2">{location.link}</span>
                    </div>
                  )}
                  {location.type === LocationType.Around && (
                    <div className="flex flex-grow items-center">
                      <img src="/api/app-store/around/icon.svg" className="h-6 w-6" alt="Around logo" />
                      <span className="text-sm ltr:ml-2 rtl:mr-2">{location.link}</span>
                    </div>
                  )}
                  {location.type === LocationType.Riverside && (
                    <div className="flex flex-grow items-center">
                      <img src="/api/app-store/riverside/icon.svg" className="h-6 w-6" alt="Riverside logo" />
                      <span className="text-sm ltr:ml-2 rtl:mr-2">{location.link}</span>
                    </div>
                  )}
                  {location.type === LocationType.Ping && (
                    <div className="flex flex-grow items-center">
                      <img src="/api/app-store/ping/icon.svg" className="h-6 w-6" alt="Ping logo" />
                      <span className="text-sm ltr:ml-2 rtl:mr-2">{location.link}</span>
                    </div>
                  )}
                  {location.type === LocationType.GoogleMeet && (
                    <div className="flex flex-grow items-center">
                      <svg
                        className="h-6 w-6"
                        viewBox="0 0 64 54"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 0V16H0" fill="#EA4335" />
                        <path
                          d="M16 0V16H37.3333V27.0222L53.3333 14.0444V5.33332C53.3333 1.77777 51.5555 0 47.9999 0"
                          fill="#FFBA00"
                        />
                        <path
                          d="M15.6438 53.3341V37.3341H37.3326V26.6675L53.3326 39.2897V48.0008C53.3326 51.5563 51.5548 53.3341 47.9993 53.3341"
                          fill="#00AC47"
                        />
                        <path d="M37.3335 26.6662L53.3335 13.6885V39.644" fill="#00832D" />
                        <path
                          d="M53.3335 13.6892L60.8001 7.64481C62.4001 6.40037 64.0001 6.40037 64.0001 8.88925V44.4447C64.0001 46.9336 62.4001 46.9336 60.8001 45.6892L53.3335 39.6447"
                          fill="#00AC47"
                        />
                        <path
                          d="M0 36.9785V48.0007C0 51.5563 1.77777 53.334 5.33332 53.334H16V36.9785"
                          fill="#0066DA"
                        />
                        <path d="M0 16H16V37.3333H0" fill="#2684FC" />
                      </svg>

                      <span className="text-sm ltr:ml-2 rtl:mr-2">Google Meet</span>
                    </div>
                  )}
                  {location.type === LocationType.Huddle01 && (
                    <div className="flex flex-grow items-center">
                      <svg
                        width="1.25em"
                        height="1.25em"
                        viewBox="0 0 26 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M14.8607 0H4.04353C3.16693 0 2.32622 0.347292 1.70636 0.965476C1.08651 1.58366 0.738281 2.4221 0.738281 3.29634V14.0844C0.738281 14.9586 1.08651 15.7971 1.70636 16.4152C2.32622 17.0334 3.16693 17.3807 4.04353 17.3807H14.8607C15.7373 17.3807 16.578 17.0334 17.1979 16.4152C17.8177 15.7971 18.166 14.9586 18.166 14.0844V3.29634C18.166 2.4221 17.8177 1.58366 17.1979 0.965476C16.578 0.347292 15.7373 0 14.8607 0V0Z"
                          fill="#246BFD"
                        />
                        <path
                          d="M24.1641 3.10754C24.0122 3.14004 23.8679 3.20106 23.7389 3.28734L21.1623 4.85161C20.7585 5.09889 20.4269 5.44766 20.2008 5.86299C19.9686 6.28713 19.8472 6.76272 19.8477 7.24595V10.1407C19.8475 10.6251 19.9694 11.1017 20.2023 11.5267C20.4295 11.9431 20.7627 12.2925 21.1683 12.5396L23.7645 14.1038C23.9325 14.2074 24.1202 14.2753 24.3158 14.3031C24.5103 14.3302 24.7084 14.3164 24.8973 14.2627C25.0881 14.2077 25.2659 14.1149 25.4201 13.99C25.5764 13.862 25.706 13.7047 25.8017 13.527C25.9321 13.2836 26.0003 13.0118 26 12.7359V4.62985C25.9995 4.39497 25.9483 4.16296 25.8498 3.94961C25.7523 3.73989 25.6097 3.55418 25.4321 3.40571C25.258 3.26046 25.0522 3.15784 24.8311 3.10604C24.6118 3.05359 24.3832 3.0541 24.1641 3.10754Z"
                          fill="#246BFD"
                        />
                        <path
                          d="M7.07325 14.3165C6.26596 14.3165 5.64849 14.0822 5.22081 13.6138C4.79313 13.1453 4.57928 12.484 4.57928 11.63V6.0112C4.57928 5.15515 4.79313 4.49338 5.22081 4.0259C5.64849 3.55842 6.26596 3.32418 7.07325 3.32318C7.87452 3.32318 8.4915 3.55742 8.92419 4.0259C9.35687 4.49438 9.57071 5.15615 9.5657 6.0112V11.63C9.5657 12.484 9.35186 13.1453 8.92419 13.6138C8.49651 14.0822 7.87953 14.3165 7.07325 14.3165ZM7.07325 12.7897C7.63914 12.7897 7.92259 12.4401 7.9236 11.7408V5.90332C7.9236 5.20409 7.64015 4.85448 7.07325 4.85448C6.50635 4.85448 6.2224 5.20409 6.2214 5.90332V11.7363C6.2214 12.4396 6.50534 12.7907 7.07325 12.7897Z"
                          fill="white"
                        />
                        <path
                          d="M12.6791 6.0112H10.9619V4.82002C11.3388 4.83087 11.7155 4.78952 12.0811 4.69716C12.3452 4.63341 12.5856 4.49564 12.7737 4.3001C12.9727 4.05484 13.1254 3.77563 13.2244 3.47601H14.3287V14.1637H12.6791V6.0112Z"
                          fill="white"
                        />
                      </svg>
                      <span className="ml-2 text-sm">Huddle01 Web3 Video</span>
                    </div>
                  )}
                  {location.type === LocationType.Daily && (
                    <div className="flex flex-grow items-center">
                      <svg
                        id="svg"
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        width="1.25em"
                        height="1.25em"
                        viewBox="0, 0, 400,400">
                        <g id="svgg">
                          <path
                            id="path0"
                            d="M100.400 142.062 C 99.630 142.280,98.394 143.076,97.654 143.830 C 96.914 144.583,95.997 145.200,95.616 145.200 C 94.776 145.200,93.802 146.248,93.389 147.598 C 93.221 148.147,92.560 149.054,91.919 149.613 C 90.024 151.267,90.020 151.390,90.010 199.645 C 89.999 248.545,90.014 248.945,91.940 250.744 C 92.571 251.334,93.229 252.262,93.401 252.808 C 93.751 253.916,95.054 255.200,95.829 255.200 C 96.107 255.200,96.710 255.808,97.169 256.550 C 98.373 258.498,94.832 258.400,164.273 258.400 C 231.741 258.400,231.099 258.418,231.949 256.552 C 232.208 255.983,233.149 255.250,234.197 254.801 C 235.357 254.304,236.005 253.774,236.014 253.314 C 236.021 252.921,236.375 251.880,236.800 251.000 C 237.225 250.120,237.579 249.119,237.586 248.776 C 237.594 248.434,237.864 247.804,238.187 247.376 C 238.696 246.704,238.776 240.392,238.787 200.426 C 238.801 149.852,238.967 154.051,236.799 149.949 C 236.610 149.591,236.332 148.647,236.183 147.850 C 235.956 146.640,235.591 146.227,233.964 145.342 C 232.893 144.759,231.907 143.938,231.774 143.518 C 231.641 143.098,231.052 142.539,230.466 142.277 C 229.079 141.657,102.567 141.447,100.400 142.062 "
                            stroke="none"
                            fill="#f9f9f9"
                            fillRule="evenodd"
                          />
                          <path
                            id="path1"
                            d="M304.600 153.562 C 304.160 153.717,302.589 154.419,301.109 155.122 C 299.629 155.825,298.171 156.400,297.869 156.400 C 297.567 156.400,296.528 156.977,295.560 157.682 C 294.592 158.387,292.872 159.272,291.739 159.649 C 290.605 160.025,288.743 160.976,287.602 161.761 C 286.460 162.547,284.778 163.386,283.863 163.628 C 282.948 163.869,281.300 164.672,280.200 165.413 C 279.100 166.154,277.660 166.885,277.000 167.037 C 275.491 167.385,272.800 168.718,272.800 169.117 C 272.800 169.485,270.749 170.506,268.629 171.194 C 266.207 171.979,263.730 174.650,263.412 176.820 C 262.921 180.167,263.353 224.092,263.889 225.295 C 264.635 226.970,266.755 228.668,269.300 229.629 C 270.565 230.107,271.600 230.622,271.600 230.775 C 271.600 231.219,274.452 232.687,276.241 233.162 C 277.144 233.403,278.381 234.061,278.991 234.626 C 279.600 235.191,281.382 236.125,282.950 236.701 C 284.517 237.278,286.430 238.236,287.200 238.831 C 287.970 239.426,289.320 240.126,290.200 240.387 C 292.160 240.967,294.400 242.079,294.400 242.472 C 294.400 242.837,297.518 244.231,299.125 244.584 C 299.790 244.730,300.737 245.198,301.228 245.625 C 301.720 246.051,302.620 246.400,303.228 246.400 C 303.837 246.400,304.605 246.504,304.936 246.631 C 305.267 246.758,305.902 246.498,306.348 246.052 C 306.793 245.607,307.721 244.951,308.410 244.595 C 310.905 243.305,310.800 245.287,310.800 199.575 C 310.800 155.897,310.789 155.600,309.169 155.600 C 309.026 155.600,308.231 155.060,307.400 154.400 C 306.569 153.740,305.780 153.218,305.645 153.240 C 305.510 153.262,305.040 153.407,304.600 153.562 "
                            stroke="none"
                            fill="#1be7b8"
                            fillRule="evenodd"
                          />
                          <path
                            id="path2"
                            d="M104.148 137.776 C 103.459 138.076,102.774 138.519,102.624 138.760 C 102.475 139.002,101.832 139.200,101.196 139.200 C 98.679 139.200,95.594 140.337,94.191 141.782 C 93.434 142.562,92.630 143.200,92.406 143.200 C 92.181 143.200,91.703 143.875,91.344 144.700 C 90.984 145.525,90.140 146.560,89.467 147.000 C 87.556 148.251,87.579 147.532,87.693 201.219 L 87.800 252.069 88.800 252.944 C 89.350 253.425,90.311 254.498,90.935 255.328 C 91.559 256.159,92.682 257.235,93.430 257.719 C 94.178 258.204,94.792 258.829,94.795 259.110 C 94.801 259.708,96.289 260.360,98.770 260.851 C 99.743 261.044,100.887 261.516,101.311 261.901 C 102.535 263.008,223.251 262.983,224.942 261.875 C 225.616 261.433,227.174 261.056,228.925 260.910 C 232.411 260.620,234.281 259.898,234.866 258.616 C 235.107 258.087,235.812 257.444,236.432 257.187 C 237.635 256.688,238.800 255.226,238.800 254.214 C 238.800 253.876,239.039 253.600,239.330 253.600 C 239.622 253.600,240.297 253.135,240.830 252.568 L 241.800 251.536 241.800 200.335 L 241.800 149.134 240.400 147.884 C 239.630 147.197,238.690 145.944,238.312 145.101 C 237.852 144.075,237.232 143.430,236.441 143.154 C 235.696 142.895,235.110 142.318,234.859 141.598 C 234.411 140.311,233.008 139.763,229.068 139.333 C 227.786 139.194,226.522 138.865,226.260 138.603 C 224.854 137.196,225.002 137.200,164.726 137.216 C 115.566 137.229,105.185 137.325,104.148 137.776 M230.299 140.581 C 231.013 140.751,232.363 141.600,233.299 142.466 C 234.235 143.333,235.488 144.338,236.085 144.699 C 236.684 145.061,237.282 145.862,237.419 146.487 C 237.556 147.110,238.076 148.110,238.574 148.710 C 240.721 151.291,240.592 148.280,240.713 198.600 C 240.829 246.814,240.750 249.650,239.248 251.152 C 238.800 251.600,238.071 252.676,237.629 253.543 C 237.187 254.410,236.187 255.514,235.407 255.995 C 234.628 256.477,233.798 257.231,233.563 257.670 C 232.125 260.355,229.256 260.458,160.200 260.300 C 96.040 260.154,98.009 260.223,96.185 258.055 C 95.663 257.435,94.598 256.495,93.818 255.964 C 93.037 255.434,92.310 254.730,92.202 254.400 C 92.094 254.070,91.396 253.117,90.652 252.283 C 88.728 250.126,88.809 252.440,88.804 199.526 C 88.800 148.835,88.746 150.246,90.767 148.075 C 91.445 147.347,92.000 146.583,92.000 146.379 C 92.000 145.965,94.367 143.600,94.781 143.600 C 94.926 143.600,95.721 142.979,96.550 142.220 C 97.645 141.217,98.567 140.772,99.928 140.589 C 100.958 140.450,101.980 140.273,102.200 140.195 C 103.020 139.904,229.052 140.284,230.299 140.581 M302.261 151.784 C 301.415 152.085,300.477 152.683,300.177 153.111 C 299.589 153.951,298.498 154.440,295.467 155.223 C 294.179 155.556,293.257 156.096,292.706 156.841 C 292.120 157.635,291.307 158.082,289.909 158.382 C 287.523 158.894,286.569 159.361,285.000 160.786 C 284.254 161.463,282.944 162.058,281.536 162.358 C 279.852 162.717,278.929 163.194,277.936 164.216 C 277.201 164.973,276.327 165.593,275.994 165.596 C 274.726 165.605,271.323 167.114,270.329 168.107 C 269.759 168.678,268.506 169.354,267.546 169.609 C 263.906 170.578,262.647 172.127,261.546 176.994 C 260.707 180.702,260.406 219.312,261.200 221.401 C 261.420 221.979,261.860 223.699,262.178 225.222 C 262.801 228.210,263.915 229.763,265.769 230.228 C 266.340 230.371,266.906 230.649,267.027 230.844 C 267.148 231.040,267.598 231.200,268.028 231.200 C 268.457 231.200,269.121 231.575,269.504 232.034 C 270.324 233.017,272.827 234.231,274.800 234.604 C 275.626 234.760,276.610 235.349,277.200 236.040 C 277.950 236.919,278.976 237.422,281.300 238.052 C 283.242 238.578,284.400 239.096,284.400 239.438 C 284.400 240.158,287.095 241.510,289.201 241.847 C 290.693 242.085,292.400 243.256,292.400 244.041 C 292.400 244.329,297.174 246.000,297.997 246.000 C 298.233 246.000,299.057 246.630,299.827 247.400 C 301.156 248.729,301.366 248.800,303.981 248.800 L 306.736 248.800 309.338 246.578 C 312.714 243.696,312.469 247.711,312.322 197.737 L 312.200 156.074 310.962 154.537 C 308.533 151.521,305.601 150.593,302.261 151.784 M307.400 154.400 C 308.231 155.060,309.026 155.600,309.169 155.600 C 310.789 155.600,310.800 155.897,310.800 199.575 C 310.800 245.287,310.905 243.305,308.410 244.595 C 307.721 244.951,306.793 245.607,306.348 246.052 C 305.902 246.498,305.267 246.758,304.936 246.631 C 304.605 246.504,303.837 246.400,303.228 246.400 C 302.620 246.400,301.720 246.051,301.228 245.625 C 300.737 245.198,299.790 244.730,299.125 244.584 C 297.518 244.231,294.400 242.837,294.400 242.472 C 294.400 242.079,292.160 240.967,290.200 240.387 C 289.320 240.126,287.970 239.426,287.200 238.831 C 286.430 238.236,284.517 237.278,282.950 236.701 C 281.382 236.125,279.600 235.191,278.991 234.626 C 278.381 234.061,277.144 233.403,276.241 233.162 C 274.452 232.687,271.600 231.219,271.600 230.775 C 271.600 230.622,270.565 230.107,269.300 229.629 C 266.755 228.668,264.635 226.970,263.889 225.295 C 263.353 224.092,262.921 180.167,263.412 176.820 C 263.730 174.650,266.207 171.979,268.629 171.194 C 270.749 170.506,272.800 169.485,272.800 169.117 C 272.800 168.718,275.491 167.385,277.000 167.037 C 277.660 166.885,279.100 166.154,280.200 165.413 C 281.300 164.672,282.948 163.869,283.863 163.628 C 284.778 163.386,286.460 162.547,287.602 161.761 C 288.743 160.976,290.605 160.025,291.739 159.649 C 292.872 159.272,294.592 158.387,295.560 157.682 C 296.528 156.977,297.567 156.400,297.869 156.400 C 298.171 156.400,299.629 155.825,301.109 155.122 C 303.608 153.934,305.049 153.337,305.645 153.240 C 305.780 153.218,306.569 153.740,307.400 154.400 "
                            stroke="none"
                            fill="#4c545c"
                            fillRule="evenodd"
                          />
                          <path
                            id="path3"
                            d="M102.200 140.195 C 101.980 140.273,100.958 140.450,99.928 140.589 C 98.567 140.772,97.645 141.217,96.550 142.220 C 95.721 142.979,94.926 143.600,94.781 143.600 C 94.367 143.600,92.000 145.965,92.000 146.379 C 92.000 146.583,91.445 147.347,90.767 148.075 C 88.746 150.246,88.800 148.835,88.804 199.526 C 88.809 252.440,88.728 250.126,90.652 252.283 C 91.396 253.117,92.094 254.070,92.202 254.400 C 92.310 254.730,93.037 255.434,93.818 255.964 C 94.598 256.495,95.663 257.435,96.185 258.055 C 98.009 260.223,96.040 260.154,160.200 260.300 C 229.256 260.458,232.125 260.355,233.563 257.670 C 233.798 257.231,234.628 256.477,235.407 255.995 C 236.187 255.514,237.187 254.410,237.629 253.543 C 238.071 252.676,238.800 251.600,239.248 251.152 C 240.750 249.650,240.829 246.814,240.713 198.600 C 240.592 148.280,240.721 151.291,238.574 148.710 C 238.076 148.110,237.556 147.110,237.419 146.487 C 237.282 145.862,236.684 145.061,236.085 144.699 C 235.488 144.338,234.235 143.333,233.299 142.466 C 232.363 141.600,231.013 140.751,230.299 140.581 C 229.052 140.284,103.020 139.904,102.200 140.195 M230.466 142.277 C 231.052 142.539,231.641 143.098,231.774 143.518 C 231.907 143.938,232.893 144.759,233.964 145.342 C 235.591 146.227,235.956 146.640,236.183 147.850 C 236.332 148.647,236.610 149.591,236.799 149.949 C 238.967 154.051,238.801 149.852,238.787 200.426 C 238.776 240.392,238.696 246.704,238.187 247.376 C 237.864 247.804,237.594 248.434,237.586 248.776 C 237.579 249.119,237.225 250.120,236.800 251.000 C 236.375 251.880,236.021 252.921,236.014 253.314 C 236.005 253.774,235.357 254.304,234.197 254.801 C 233.149 255.250,232.208 255.983,231.949 256.552 C 231.099 258.418,231.741 258.400,164.273 258.400 C 94.832 258.400,98.373 258.498,97.169 256.550 C 96.710 255.808,96.107 255.200,95.829 255.200 C 95.054 255.200,93.751 253.916,93.401 252.808 C 93.229 252.262,92.571 251.334,91.940 250.744 C 90.014 248.945,89.999 248.545,90.010 199.645 C 90.020 151.390,90.024 151.267,91.919 149.613 C 92.560 149.054,93.221 148.147,93.389 147.598 C 93.802 146.248,94.776 145.200,95.616 145.200 C 95.997 145.200,96.914 144.583,97.654 143.830 C 98.394 143.076,99.630 142.280,100.400 142.062 C 102.567 141.447,229.079 141.657,230.466 142.277 "
                            stroke="none"
                            fill="#949c9c"
                            fillRule="evenodd"
                          />
                          <path
                            id="path4"
                            d="M35.200 0.984 C 35.200 1.947,35.121 1.971,31.700 2.084 L 28.200 2.200 28.077 3.900 L 27.954 5.600 25.403 5.600 C 21.914 5.600,20.903 6.043,20.590 7.712 C 20.367 8.902,20.142 9.103,18.669 9.430 C 17.102 9.777,16.988 9.898,16.800 11.400 C 16.605 12.956,16.554 13.003,14.922 13.122 C 13.260 13.243,13.243 13.260,13.122 14.922 C 13.003 16.554,12.956 16.605,11.400 16.800 C 9.898 16.988,9.777 17.102,9.430 18.669 C 9.103 20.142,8.902 20.367,7.712 20.590 C 6.043 20.903,5.600 21.914,5.600 25.403 L 5.600 27.954 3.900 28.077 L 2.200 28.200 2.084 31.700 C 1.971 35.121,1.947 35.200,0.984 35.200 L 0.000 35.200 0.000 200.000 L 0.000 364.800 0.984 364.800 C 1.947 364.800,1.971 364.879,2.084 368.300 L 2.200 371.800 3.900 372.177 L 5.600 372.554 5.600 374.851 C 5.600 378.083,6.072 379.102,7.712 379.410 C 8.902 379.633,9.103 379.858,9.430 381.331 C 9.777 382.898,9.898 383.012,11.400 383.200 C 12.953 383.394,13.004 383.449,13.121 385.059 C 13.247 386.786,13.757 387.181,15.876 387.195 C 16.598 387.199,16.773 387.463,16.876 388.700 C 16.992 390.104,17.107 390.224,18.669 390.570 C 20.142 390.897,20.367 391.098,20.590 392.288 C 20.903 393.957,21.914 394.400,25.403 394.400 L 27.954 394.400 28.077 396.100 L 28.200 397.800 31.700 397.916 C 35.121 398.029,35.200 398.053,35.200 399.016 L 35.200 400.000 200.000 400.000 L 364.800 400.000 364.800 399.016 C 364.800 398.053,364.879 398.029,368.300 397.916 L 371.800 397.800 372.177 396.100 L 372.554 394.400 375.103 394.400 C 378.233 394.400,379.094 393.974,379.414 392.265 C 379.633 391.101,379.865 390.896,381.331 390.570 C 382.893 390.224,383.008 390.104,383.124 388.700 C 383.241 387.288,383.327 387.200,384.596 387.200 C 386.308 387.200,387.200 386.308,387.200 384.596 C 387.200 383.327,387.288 383.241,388.700 383.124 C 390.104 383.008,390.224 382.893,390.570 381.331 C 390.896 379.865,391.101 379.633,392.265 379.414 C 393.974 379.094,394.400 378.233,394.400 375.103 L 394.400 372.554 396.100 372.177 L 397.800 371.800 397.916 368.300 C 398.029 364.879,398.053 364.800,399.016 364.800 L 400.000 364.800 400.000 200.000 L 400.000 35.200 399.016 35.200 C 398.053 35.200,398.029 35.121,397.916 31.700 L 397.800 28.200 396.100 28.077 L 394.400 27.954 394.400 25.403 C 394.400 21.914,393.957 20.903,392.288 20.590 C 391.098 20.367,390.897 20.142,390.570 18.669 C 390.224 17.107,390.104 16.992,388.700 16.876 C 387.463 16.773,387.199 16.598,387.195 15.876 C 387.181 13.757,386.786 13.247,385.059 13.121 C 383.452 13.004,383.396 12.953,383.275 11.480 C 383.121 9.617,382.265 9.200,378.597 9.200 L 376.046 9.200 375.923 7.500 C 375.802 5.821,375.779 5.798,374.173 5.681 C 372.616 5.566,372.529 5.488,372.173 3.881 L 371.800 2.200 368.300 2.084 C 364.879 1.971,364.800 1.947,364.800 0.984 L 364.800 0.000 200.000 0.000 L 35.200 0.000 35.200 0.984 M224.918 137.663 C 225.394 137.918,225.998 138.341,226.260 138.603 C 226.522 138.865,227.786 139.194,229.068 139.333 C 233.008 139.763,234.411 140.311,234.859 141.598 C 235.110 142.318,235.696 142.895,236.441 143.154 C 237.232 143.430,237.852 144.075,238.312 145.101 C 238.690 145.944,239.630 147.197,240.400 147.884 L 241.800 149.134 241.800 200.335 L 241.800 251.536 240.830 252.568 C 240.297 253.135,239.622 253.600,239.330 253.600 C 239.039 253.600,238.800 253.876,238.800 254.214 C 238.800 255.226,237.635 256.688,236.432 257.187 C 235.812 257.444,235.107 258.087,234.866 258.616 C 234.281 259.898,232.411 260.620,228.925 260.910 C 227.174 261.056,225.616 261.433,224.942 261.875 C 223.251 262.983,102.535 263.008,101.311 261.901 C 100.887 261.516,99.743 261.044,98.770 260.851 C 96.289 260.360,94.801 259.708,94.795 259.110 C 94.792 258.829,94.178 258.204,93.430 257.719 C 92.682 257.235,91.559 256.159,90.935 255.328 C 90.311 254.498,89.350 253.425,88.800 252.944 L 87.800 252.069 87.693 201.219 C 87.579 147.532,87.556 148.251,89.467 147.000 C 90.140 146.560,90.984 145.525,91.344 144.700 C 91.703 143.875,92.181 143.200,92.406 143.200 C 92.630 143.200,93.434 142.562,94.191 141.782 C 95.594 140.337,98.679 139.200,101.196 139.200 C 101.832 139.200,102.475 139.002,102.624 138.760 C 103.575 137.222,103.193 137.232,164.726 137.216 C 208.933 137.204,224.273 137.318,224.918 137.663 M308.162 152.107 C 309.021 152.598,310.281 153.692,310.962 154.537 L 312.200 156.074 312.322 197.737 C 312.469 247.711,312.714 243.696,309.338 246.578 L 306.736 248.800 303.981 248.800 C 301.366 248.800,301.156 248.729,299.827 247.400 C 299.057 246.630,298.233 246.000,297.997 246.000 C 297.174 246.000,292.400 244.329,292.400 244.041 C 292.400 243.256,290.693 242.085,289.201 241.847 C 287.095 241.510,284.400 240.158,284.400 239.438 C 284.400 239.096,283.242 238.578,281.300 238.052 C 278.976 237.422,277.950 236.919,277.200 236.040 C 276.610 235.349,275.626 234.760,274.800 234.604 C 272.827 234.231,270.324 233.017,269.504 232.034 C 269.121 231.575,268.457 231.200,268.028 231.200 C 267.598 231.200,267.148 231.040,267.027 230.844 C 266.906 230.649,266.340 230.371,265.769 230.228 C 263.915 229.763,262.801 228.210,262.178 225.222 C 261.860 223.699,261.420 221.979,261.200 221.401 C 260.406 219.312,260.707 180.702,261.546 176.994 C 262.647 172.127,263.906 170.578,267.546 169.609 C 268.506 169.354,269.759 168.678,270.329 168.107 C 271.323 167.114,274.726 165.605,275.994 165.596 C 276.327 165.593,277.201 164.973,277.936 164.216 C 278.929 163.194,279.852 162.717,281.536 162.358 C 282.944 162.058,284.254 161.463,285.000 160.786 C 286.569 159.361,287.523 158.894,289.909 158.382 C 291.307 158.082,292.120 157.635,292.706 156.841 C 293.257 156.096,294.179 155.556,295.467 155.223 C 298.498 154.440,299.589 153.951,300.177 153.111 C 301.487 151.241,305.719 150.709,308.162 152.107 "
                            stroke="none"
                            fill="#141c24"
                            fillRule="evenodd"
                          />
                        </g>
                      </svg>
                      <span className="text-sm ltr:ml-2 rtl:mr-2">Cal.com Video</span>
                    </div>
                  )}
                  {location.type === LocationType.Zoom && (
                    <div className="flex flex-grow items-center">
                      <svg
                        className="h-6 w-6"
                        viewBox="0 0 64 64"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M32 0C49.6733 0 64 14.3267 64 32C64 49.6733 49.6733 64 32 64C14.3267 64 0 49.6733 0 32C0 14.3267 14.3267 0 32 0Z"
                          fill="#E5E5E4"
                        />
                        <path
                          d="M32.0002 0.623047C49.3292 0.623047 63.3771 14.6709 63.3771 31.9999C63.3771 49.329 49.3292 63.3768 32.0002 63.3768C14.6711 63.3768 0.623291 49.329 0.623291 31.9999C0.623291 14.6709 14.6716 0.623047 32.0002 0.623047Z"
                          fill="white"
                        />
                        <path
                          d="M31.9998 3.14014C47.9386 3.14014 60.8597 16.0612 60.8597 32C60.8597 47.9389 47.9386 60.8599 31.9998 60.8599C16.0609 60.8599 3.13989 47.9389 3.13989 32C3.13989 16.0612 16.0609 3.14014 31.9998 3.14014Z"
                          fill="#4A8CFF"
                        />
                        <path
                          d="M13.1711 22.9581V36.5206C13.1832 39.5875 15.6881 42.0558 18.743 42.0433H38.5125C39.0744 42.0433 39.5266 41.5911 39.5266 41.0412V27.4788C39.5145 24.4119 37.0096 21.9435 33.9552 21.956H14.1857C13.6238 21.956 13.1716 22.4082 13.1716 22.9581H13.1711ZM40.7848 28.2487L48.9469 22.2864C49.6557 21.6998 50.2051 21.8462 50.2051 22.9095V41.0903C50.2051 42.2999 49.5329 42.1536 48.9469 41.7134L40.7848 35.7631V28.2487Z"
                          fill="white"
                        />
                      </svg>
                      <span className="text-sm ltr:ml-2 rtl:mr-2">Zoom Video</span>
                    </div>
                  )}
                  {location.type === LocationType.Tandem && (
                    <div className="flex flex-grow items-center">
                      <svg
                        width="1.25em"
                        height="1.25em"
                        viewBox="0 0 400 400"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M167.928 256.163L64 324V143.835L167.928 76V256.163Z"
                          fill="#4341DC"
                        />
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M335.755 256.163L231.827 324V143.835L335.755 76V256.163Z"
                          fill="#00B6B6"
                        />
                      </svg>
                      <span className="ml-2 text-sm">Tandem Video</span>
                    </div>
                  )}
                  {location.type === LocationType.Jitsi && (
                    <div className="flex flex-grow items-center">
                      <svg
                        className="h-6 w-6"
                        viewBox="0 0 60 60"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M45.4181 23.2445C45.0316 22.4169 44.4086 21.7223 43.6277 21.2487C42.6993 20.6602 41.5397 20.5354 40.7313 20.5354C40.4591 20.5354 40.1871 20.5495 39.9163 20.5776H39.8961C39.9105 20.4663 39.9393 20.3223 39.9633 20.2051C40.0037 19.9997 40.0497 19.7664 40.0757 19.5235C40.1832 18.4819 39.8126 17.0803 39.1301 15.9543C39.0216 15.7747 39.0254 15.7133 39.0254 15.7133C39.0596 15.6624 39.0995 15.6157 39.1445 15.5741L39.2069 15.5088C40.8206 13.7808 41.3083 11.881 40.6545 9.85058C39.4152 6.00002 39.083 6.00002 38.8401 6.00002C38.786 5.99948 38.7323 6.01041 38.6827 6.03209C38.633 6.05376 38.5886 6.08569 38.5521 6.12578C38.5118 6.1746 38.4823 6.23142 38.4656 6.29249C38.4489 6.35356 38.4454 6.41747 38.4552 6.48002C38.5809 7.75682 38.2929 9.58466 38.1009 10.2807C37.8657 11.1562 37.0449 12.4618 34.4529 13.7031C34.2709 13.7806 34.0851 13.8489 33.8961 13.9075C33.0504 14.1907 31.6373 14.664 30.852 15.745C30.2597 16.4391 30.1166 17.1341 29.8603 18.3888C29.6318 19.5043 29.4475 20.8627 29.8085 22.4842C29.8449 22.6445 29.8795 22.7789 29.9112 22.8989C29.9333 22.9843 29.9525 23.0583 29.9669 23.1226L29.9976 23.1159L29.9659 23.1245C29.9899 23.2205 29.9745 23.2435 29.94 23.2675C29.8153 23.3169 29.6869 23.3564 29.556 23.3856C29.172 23.4471 28.788 23.5152 28.4213 23.5872C27.2539 23.7879 23.7249 24.3965 22.0997 26.9837C21.0965 28.5792 20.9544 30.6634 21.6753 33.1853C22.4232 35.6813 23.9073 37.3968 24.923 37.7462L24.9393 37.752C25.0123 37.7846 25.0824 37.8125 25.1505 37.8355C25.1505 37.9056 25.1438 37.991 25.1352 38.087C25.1281 38.1293 25.1214 38.1754 25.115 38.2253C25.0037 39.0394 24.6197 39.9168 24.228 39.9398C24.0216 39.8995 23.2037 39.4358 22.6248 39.0557C22.4392 38.9347 22.2632 38.8189 22.0968 38.7082C20.4811 37.6387 19.5902 37.0502 18.2289 36.8986C18.1824 36.8936 18.1356 36.891 18.0888 36.8909C16.6488 36.8909 14.0568 39.3158 14.0021 44.1485C13.9742 46.5696 14.2277 48.7824 14.7576 50.7264C15.1358 52.1203 15.539 52.9142 15.6561 53.1264L16.1227 54L16.3358 53.04C17.459 47.952 18.8453 46.7261 21.1521 45.2592C22.8427 46.8432 25.0632 47.6784 27.5918 47.6784C29.723 47.6784 31.9531 47.0592 33.8693 45.9341C35.7518 44.8301 37.2053 43.3421 38.0933 41.6227C38.2411 41.7187 38.4197 41.8435 38.5377 41.9261C38.9601 42.2218 39.0494 42.2842 39.2001 42.2842H39.2136C39.3787 42.2774 40.9358 41.7552 42.5304 39.8074C43.4568 38.6755 44.2209 37.2758 44.8008 35.6448C45.5189 33.6288 45.9528 31.248 46.1006 28.5706C46.2638 26.3223 46.0353 24.5319 45.4219 23.2493L45.4181 23.2445ZM39.4449 10.3027C39.5788 10.8426 39.5962 11.4049 39.4958 11.952C39.3461 13.0157 38.8949 13.968 38.1249 14.8368C38.7811 13.3969 39.2257 11.8698 39.4449 10.3027V10.3027ZM38.3313 16.9047C38.5659 17.2594 38.7449 17.6479 38.8622 18.0567C38.9924 18.5927 38.9691 19.1546 38.795 19.6781C38.5195 20.3338 38.1499 20.665 37.6958 20.665H37.6353C37.4753 20.6409 37.3219 20.5847 37.1841 20.4999C36.6005 20.1581 36.2846 19.2519 36.5121 18.5875C36.5217 18.5683 36.5304 18.5482 36.539 18.5271C36.5765 18.4311 36.683 18.2467 36.9787 17.9616C37.4011 17.5882 38.0184 17.1168 38.3294 16.9056L38.3313 16.9047ZM31.5729 16.7242L31.5787 16.7136V16.704C31.7035 16.3968 32.5627 15.8995 33.1329 15.5703C33.204 15.528 33.275 15.4867 33.3461 15.4464C33.5958 15.3153 33.8522 15.1971 34.1141 15.0922C35.052 14.6928 36.5141 14.0707 37.7179 12.912C37.3685 14.137 36.5275 16.2 35.1451 17.449C34.8379 17.7264 34.2177 17.9722 33.4987 18.2563C32.724 18.5616 31.7928 18.9283 30.8894 19.4823C30.9595 18.7757 31.1774 17.5431 31.5681 16.7242H31.5729ZM30.9729 20.7159C31.4376 20.3319 32.2881 19.8115 35.075 18.8919C35.0942 18.9783 35.1163 19.0896 35.1374 19.2C35.1547 19.2835 35.1729 19.3786 35.1941 19.4823C35.3765 20.3827 35.5781 21.3946 37.4529 21.9562C37.2782 22.3402 36.9192 22.9891 36.7944 23.113L36.7531 23.1485L36.7243 23.1955C36.3595 23.7811 34.3877 25.0589 33.5045 25.0589C33.4665 25.0593 33.4286 25.0564 33.3912 25.0503C32.8593 24.9475 31.6382 23.8627 31.2792 23.0611C30.5851 21.4877 30.7272 20.9203 30.9681 20.7197L30.9729 20.7159ZM24.0293 35.1581C23.0078 33.6384 22.2341 30.983 22.7409 28.848V28.8384C22.9857 27.6768 23.7969 26.9933 24.132 26.7533L24.18 26.7178C24.6773 26.2839 25.6949 25.8259 27.0465 25.4256C27.2385 25.3757 27.3441 25.3536 27.3489 25.3536C27.5976 25.3018 27.8693 25.2394 28.1333 25.1789C28.6328 25.0513 29.1392 24.9523 29.6501 24.8823C29.7768 24.8688 29.9054 24.8448 30.0283 24.8208C30.1944 24.7844 30.3634 24.7625 30.5333 24.7555C30.6688 24.7483 30.8031 24.7839 30.9173 24.8573C31.4184 25.4525 32.6453 26.6275 33.4497 26.6967H33.4737H33.5006C34.4165 26.6477 35.8517 25.7539 37.7678 24.0384C38.0933 23.7504 38.3957 23.4989 38.6923 23.2791L38.7288 23.2512C39.2517 22.8546 39.8275 22.533 40.4395 22.296C40.2389 22.9527 40.0795 24.0749 40.7275 25.656C41.0645 26.4739 41.7115 28.3171 42.2481 30.1219C43.1717 33.2304 43.043 33.7776 43.0248 33.8285C42.9992 33.9341 42.9574 34.0351 42.9009 34.128C42.8289 34.1141 42.7593 34.0895 42.6945 34.055C42.2289 33.84 41.7067 33.456 41.0961 33.0048C39.9633 32.1744 38.555 31.1414 36.4939 30.336C34.98 29.7456 33.4747 29.4451 32.0222 29.4451C31.4203 29.4441 30.8198 29.5013 30.2289 29.616C26.9822 30.2563 25.2705 31.6877 24.3518 32.4576L24.3451 32.4634C24.2847 32.5123 24.2409 32.5787 24.2198 32.6534C24.1987 32.7282 24.2012 32.8077 24.227 32.881C24.2535 32.9531 24.3017 33.0152 24.365 33.0587C24.4283 33.1022 24.5035 33.125 24.5803 33.1238C24.6638 33.1238 24.7454 33.1008 25.0152 33.023C25.988 32.7332 26.9835 32.5257 27.9912 32.4029C28.3522 32.3608 28.7154 32.3393 29.0789 32.3386C30.6504 32.3386 32.0961 32.8186 33.6264 33.8582C33.9768 34.151 34.1909 34.345 34.3205 34.4726L34.188 34.5072L33.2597 34.7693C30.9614 35.4192 27.4872 36.4013 25.8427 36.4013C25.7166 36.4023 25.5906 36.3949 25.4654 36.3792C25.0392 36.3168 24.5189 35.8714 24.036 35.159L24.0293 35.1581ZM17.2507 46.8173C16.6038 47.6606 16.1274 48.6219 15.8481 49.6474C15.539 48.1661 15.1761 45.7296 15.3825 43.8326C15.8126 39.9024 17.7595 38.5862 18.0485 38.5171H18.0667C18.083 38.5171 18.1022 38.5171 18.1406 38.5584C18.2961 38.7274 18.6321 39.4406 18.3873 42.3907C18.3297 42.9984 18.4757 43.513 18.8232 43.92C19.0586 44.1892 19.3548 44.3985 19.6872 44.5306C18.7501 45.1495 17.9249 45.923 17.2469 46.8182L17.2507 46.8173ZM20.5598 42.96C20.4584 43.0054 20.3492 43.0308 20.2382 43.0349C20.1992 43.0383 20.1599 43.0329 20.1233 43.0189C20.0867 43.0049 20.0538 42.9828 20.027 42.9542C19.9646 42.889 19.8235 42.6662 19.8686 42.0086C19.9003 41.6851 19.9454 41.3626 19.9877 41.0486C20.0819 40.4573 20.1384 39.8606 20.1566 39.2621C21.2913 40.0051 22.5489 40.7923 23.363 41.1552C22.8312 41.6266 21.7243 42.4742 20.5598 42.9619V42.96ZM35.3678 42.8544C33.5373 44.7625 31.0651 45.9252 28.428 46.1184C28.115 46.1414 27.803 46.153 27.5025 46.153C24.0302 46.153 22.2657 44.6794 21.4545 43.8586C25.3781 42.1661 26.1739 39.7459 26.5214 38.689C26.555 38.5862 26.5857 38.497 26.6174 38.4202C26.7672 38.3453 27.2433 38.1322 28.7121 37.5821C29.8641 37.1674 31.2456 36.7027 32.4638 36.2918C33.4785 35.9501 34.355 35.6534 34.8341 35.4778L34.8734 35.4653C34.9694 35.4384 35.027 35.4259 35.0654 35.4192L35.0923 35.4538C35.5387 36.0355 36.275 36.3898 36.2817 36.3946C36.8353 36.6416 37.4273 36.791 38.0318 36.8362C38.0174 38.9338 37.0593 41.1091 35.3736 42.8534L35.3678 42.8544ZM38.411 35.6726C36.9585 35.6726 36.4488 35.2051 35.9736 34.6397C33.6149 31.8278 31.0075 31.367 29.9947 31.2989C29.6702 31.2778 29.3525 31.2672 29.0481 31.2672C28.7928 31.2672 28.5432 31.2739 28.2993 31.2893C29.4742 30.8898 30.7064 30.6849 31.9473 30.6826C34.5489 30.6826 37.0536 31.6042 39.3893 33.4205C40.3416 34.1606 41.0424 34.6858 41.6481 35.1072C41.3531 35.1949 40.9547 35.3069 40.4529 35.4432L40.2609 35.496C39.651 35.6044 39.0333 35.6635 38.4139 35.6726H38.411ZM39.3163 40.9901C39.1637 40.8557 38.9323 40.6416 38.6933 40.4237C38.9129 39.8647 39.0788 39.2861 39.1886 38.6957C39.3019 38.0726 39.3729 37.2557 39.4056 36.8227C40.0954 36.7196 40.7783 36.5744 41.4504 36.3878C42.2597 36.1555 42.8846 35.8915 43.3301 35.591C41.9409 39.0595 39.9288 40.583 39.3163 40.9882V40.9901ZM44.123 33.0576C43.9166 31.3478 43.2245 29.2339 42.9537 28.4122C42.9249 28.3162 42.9009 28.2471 42.8846 28.1962C42.8645 28.1309 42.8021 27.9571 42.6734 27.6019C42.3403 26.6717 41.6453 24.7383 41.5214 24.1661C41.3438 23.3251 41.7451 22.1683 42.0014 22.0675C42.0806 22.0378 42.1645 22.0225 42.2491 22.0224C42.7214 22.0224 43.3051 22.4688 43.7669 23.1888C44.3256 24.0528 44.6568 25.1981 44.7 26.4039C44.796 29.0352 44.5521 31.2336 44.124 33.0576"
                          fill="#727272"
                        />
                      </svg>
                      <span className="ml-2 text-sm">Jitsi Meet</span>
                    </div>
                  )}
                  {location.type === LocationType.Teams && (
                    <div className="flex flex-grow items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        viewBox="0 0 2228.833 2073.333">
                        <path
                          fill="#5059C9"
                          d="M1554.637,777.5h575.713c54.391,0,98.483,44.092,98.483,98.483c0,0,0,0,0,0v524.398	c0,199.901-162.051,361.952-361.952,361.952h0h-1.711c-199.901,0.028-361.975-162-362.004-361.901c0-0.017,0-0.034,0-0.052V828.971	C1503.167,800.544,1526.211,777.5,1554.637,777.5L1554.637,777.5z"
                        />
                        <circle fill="#5059C9" cx="1943.75" cy="440.583" r="233.25" />
                        <circle fill="#7B83EB" cx="1218.083" cy="336.917" r="336.917" />
                        <path
                          fill="#7B83EB"
                          d="M1667.323,777.5H717.01c-53.743,1.33-96.257,45.931-95.01,99.676v598.105	c-7.505,322.519,247.657,590.16,570.167,598.053c322.51-7.893,577.671-275.534,570.167-598.053V877.176	C1763.579,823.431,1721.066,778.83,1667.323,777.5z"
                        />
                        <path
                          opacity=".1"
                          d="M1244,777.5v838.145c-0.258,38.435-23.549,72.964-59.09,87.598	c-11.316,4.787-23.478,7.254-35.765,7.257H667.613c-6.738-17.105-12.958-34.21-18.142-51.833	c-18.144-59.477-27.402-121.307-27.472-183.49V877.02c-1.246-53.659,41.198-98.19,94.855-99.52H1244z"
                        />
                        <path
                          opacity=".2"
                          d="M1192.167,777.5v889.978c-0.002,12.287-2.47,24.449-7.257,35.765	c-14.634,35.541-49.163,58.833-87.598,59.09H691.975c-8.812-17.105-17.105-34.21-24.362-51.833	c-7.257-17.623-12.958-34.21-18.142-51.833c-18.144-59.476-27.402-121.307-27.472-183.49V877.02	c-1.246-53.659,41.198-98.19,94.855-99.52H1192.167z"
                        />
                        <path
                          opacity=".2"
                          d="M1192.167,777.5v786.312c-0.395,52.223-42.632,94.46-94.855,94.855h-447.84	c-18.144-59.476-27.402-121.307-27.472-183.49V877.02c-1.246-53.659,41.198-98.19,94.855-99.52H1192.167z"
                        />
                        <path
                          opacity=".2"
                          d="M1140.333,777.5v786.312c-0.395,52.223-42.632,94.46-94.855,94.855H649.472	c-18.144-59.476-27.402-121.307-27.472-183.49V877.02c-1.246-53.659,41.198-98.19,94.855-99.52H1140.333z"
                        />
                        <path
                          opacity=".1"
                          d="M1244,509.522v163.275c-8.812,0.518-17.105,1.037-25.917,1.037	c-8.812,0-17.105-0.518-25.917-1.037c-17.496-1.161-34.848-3.937-51.833-8.293c-104.963-24.857-191.679-98.469-233.25-198.003	c-7.153-16.715-12.706-34.071-16.587-51.833h258.648C1201.449,414.866,1243.801,457.217,1244,509.522z"
                        />
                        <path
                          opacity=".2"
                          d="M1192.167,561.355v111.442c-17.496-1.161-34.848-3.937-51.833-8.293	c-104.963-24.857-191.679-98.469-233.25-198.003h190.228C1149.616,466.699,1191.968,509.051,1192.167,561.355z"
                        />
                        <path
                          opacity=".2"
                          d="M1192.167,561.355v111.442c-17.496-1.161-34.848-3.937-51.833-8.293	c-104.963-24.857-191.679-98.469-233.25-198.003h190.228C1149.616,466.699,1191.968,509.051,1192.167,561.355z"
                        />
                        <path
                          opacity=".2"
                          d="M1140.333,561.355v103.148c-104.963-24.857-191.679-98.469-233.25-198.003	h138.395C1097.783,466.699,1140.134,509.051,1140.333,561.355z"
                        />
                        <linearGradient
                          id="a"
                          gradientUnits="userSpaceOnUse"
                          x1="198.099"
                          y1="1683.0726"
                          x2="942.2344"
                          y2="394.2607"
                          gradientTransform="matrix(1 0 0 -1 0 2075.3333)">
                          <stop offset="0" stopColor="#5a62c3" />
                          <stop offset=".5" stopColor="#4d55bd" />
                          <stop offset="1" stopColor="#3940ab" />
                        </linearGradient>
                        <path
                          fill="url(#a)"
                          d="M95.01,466.5h950.312c52.473,0,95.01,42.538,95.01,95.01v950.312c0,52.473-42.538,95.01-95.01,95.01	H95.01c-52.473,0-95.01-42.538-95.01-95.01V561.51C0,509.038,42.538,466.5,95.01,466.5z"
                        />
                        <path
                          fill="#FFF"
                          d="M820.211,828.193H630.241v517.297H509.211V828.193H320.123V727.844h500.088V828.193z"
                        />
                      </svg>
                      <span className="ml-2 text-sm">MS Teams</span>
                    </div>
                  )}
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
            ))}
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
                      seatsPerTimeSlot,
                      metadata: {
                        ...(smartContractAddress ? { smartContractAddress } : {}),
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
                                {t("create_events_on")}
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
                        {eventType.isWeb3Active && (
                          <div className="block items-center sm:flex">
                            <div className="min-w-48 mb-4 sm:mb-0">
                              <label
                                htmlFor="smartContractAddress"
                                className="flex text-sm font-medium text-neutral-700">
                                {t("Smart Contract Address")}
                              </label>
                            </div>
                            <div className="w-full">
                              <div className="relative mt-1 rounded-sm">
                                <input
                                  type="text"
                                  className="block w-full rounded-sm border-gray-300 text-sm "
                                  placeholder={t("Example: 0x71c7656ec7ab88b098defb751b7401b5f6d8976f")}
                                  defaultValue={(eventType.metadata.smartContractAddress || "") as string}
                                  {...formMethods.register("smartContractAddress")}
                                />
                              </div>
                            </div>
                          </div>
                        )}
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

  const web3Credentials = credentials.find((credential) => credential.type.includes("_web3"));
  const { locations, metadata, ...restEventType } = rawEventType;
  const eventType = {
    ...restEventType,
    recurringEvent: parseRecurringEvent(restEventType.recurringEvent),
    locations: locations as unknown as LocationObject[],
    metadata: (metadata || {}) as JSONObject,
    isWeb3Active:
      web3Credentials && web3Credentials.key
        ? (((web3Credentials.key as JSONObject).isWeb3Active || false) as boolean)
        : false,
  };

  const hasGiphyIntegration = !!credentials.find((credential) => credential.type === "giphy_other");

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
      currency,
      currentUserMembership,
    },
  };
};

export default EventTypePage;
