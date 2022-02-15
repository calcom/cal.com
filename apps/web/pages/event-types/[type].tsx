import { PhoneIcon, XIcon } from "@heroicons/react/outline";
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
import { Availability, EventTypeCustomInput, PeriodType, Prisma, SchedulingType } from "@prisma/client";
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
import { useLocale } from "@lib/hooks/useLocale";
import getIntegrations, { hasIntegration } from "@lib/integrations/getIntegrations";
import { LocationType } from "@lib/location";
import showToast from "@lib/notification";
import prisma from "@lib/prisma";
import { trpc } from "@lib/trpc";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import DestinationCalendarSelector from "@components/DestinationCalendarSelector";
import { Dialog, DialogContent, DialogTrigger } from "@components/Dialog";
import Shell from "@components/Shell";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import { Form } from "@components/form/fields";
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

interface Token {
  name?: string;
  address: string;
  symbol: string;
}

interface NFT extends Token {
  // Some OpenSea NFTs have several contracts
  contracts: Array<Token>;
}
type AvailabilityInput = Pick<Availability, "days" | "startTime" | "endTime">;

type OptionTypeBase = {
  label: string;
  value: LocationType;
  disabled?: boolean;
};

const addDefaultLocationOptions = (
  defaultLocations: OptionTypeBase[],
  locationOptions: OptionTypeBase[]
): void => {
  const existingLocationOptions = locationOptions.flatMap((locationOptionItem) => [locationOptionItem.value]);

  defaultLocations.map((item) => {
    if (!existingLocationOptions.includes(item.value)) {
      locationOptions.push(item);
    }
  });
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
  const { eventType, locationOptions, availability, team, teamMembers, hasPaymentIntegration, currency } =
    props;

  /** Appending default locations */

  const defaultLocations = [
    { value: LocationType.InPerson, label: t("in_person_meeting") },
    { value: LocationType.Jitsi, label: "Jitsi Meet" },
    { value: LocationType.Phone, label: t("phone_call") },
  ];

  addDefaultLocationOptions(defaultLocations, locationOptions);

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
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: You are not able to update this event`;
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
  const connectedCalendarsQuery = trpc.useQuery(["viewer.connectedCalendars"]);

  const [editIcon, setEditIcon] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedTimeZone, setSelectedTimeZone] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<OptionTypeBase | undefined>(undefined);
  const [selectedCustomInput, setSelectedCustomInput] = useState<EventTypeCustomInput | undefined>(undefined);
  const [selectedCustomInputModalOpen, setSelectedCustomInputModalOpen] = useState(false);
  const [customInputs, setCustomInputs] = useState<EventTypeCustomInput[]>(
    eventType.customInputs.sort((a, b) => a.id - b.id) || []
  );
  const [tokensList, setTokensList] = useState<Array<Token>>([]);

  const periodType =
    PERIOD_TYPES.find((s) => s.type === eventType.periodType) ||
    PERIOD_TYPES.find((s) => s.type === "UNLIMITED");

  const [requirePayment, setRequirePayment] = useState(eventType.price > 0);
  const [advancedSettingsVisible, setAdvancedSettingsVisible] = useState(false);

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

  const LocationOptions = () => {
    if (!selectedLocation) {
      return null;
    }
    switch (selectedLocation.value) {
      case LocationType.InPerson:
        return (
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              {t("set_address_place")}
            </label>
            <div className="mt-1">
              <input
                type="text"
                {...locationFormMethods.register("locationAddress")}
                id="address"
                required
                className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-sm border-gray-300 shadow-sm sm:text-sm"
                defaultValue={
                  formMethods
                    .getValues("locations")
                    .find((location) => location.type === LocationType.InPerson)?.address
                }
              />
            </div>
          </div>
        );
      case LocationType.Phone:
        return <p className="text-sm">{t("cal_invitee_phone_number_scheduling")}</p>;
      case LocationType.GoogleMeet:
        return <p className="text-sm">{t("cal_provide_google_meet_location")}</p>;
      case LocationType.Zoom:
        return <p className="text-sm">{t("cal_provide_zoom_meeting_url")}</p>;
      case LocationType.Daily:
        return <p className="text-sm">{t("cal_provide_video_meeting_url")}</p>;
      case LocationType.Jitsi:
        return <p className="text-sm">{t("cal_provide_jitsi_meeting_url")}</p>;
      case LocationType.Huddle01:
        return <p className="text-sm">{t("cal_provide_huddle01_meeting_url")}</p>;
      case LocationType.Tandem:
        return <p className="text-sm">{t("cal_provide_tandem_meeting_url")}</p>;
      default:
        return null;
    }
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

  const permalink = `${process.env.NEXT_PUBLIC_APP_URL}/${
    team ? `team/${team.slug}` : eventType.users[0].username
  }/${eventType.slug}`;

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
    avatar: `${process.env.NEXT_PUBLIC_APP_URL}/${username}/avatar.png`,
  });

  const formMethods = useForm<{
    title: string;
    eventTitle: string;
    smartContractAddress: string;
    eventName: string;
    slug: string;
    length: number;
    description: string;
    disableGuests: boolean;
    requiresConfirmation: boolean;
    schedulingType: SchedulingType | null;
    price: number;
    hidden: boolean;
    locations: { type: LocationType; address?: string }[];
    customInputs: EventTypeCustomInput[];
    users: string[];
    availability: {
      openingHours: AvailabilityInput[];
      dateOverrides: AvailabilityInput[];
    };
    timeZone: string;
    periodType: PeriodType;
    periodDays: number;
    periodCountCalendarDays: "1" | "0";
    periodDates: { startDate: Date; endDate: Date };
    minimumBookingNotice: number;
    slotInterval: number | null;
    destinationCalendar: {
      integration: string;
      externalId: string;
    };
  }>({
    defaultValues: {
      locations: eventType.locations || [],
      periodDates: {
        startDate: periodDates.startDate,
        endDate: periodDates.endDate,
      },
    },
  });

  const locationFormMethods = useForm<{
    locationType: LocationType;
    locationAddress: string;
  }>();

  const Locations = () => {
    return (
      <div className="w-full">
        {formMethods.getValues("locations").length === 0 && (
          <div className="flex">
            <Select
              options={locationOptions}
              isSearchable={false}
              classNamePrefix="react-select"
              className="react-select-container focus:border-primary-500 focus:ring-primary-500 block w-full min-w-0 flex-1 rounded-sm border border-gray-300 sm:text-sm"
              onChange={(e) => {
                if (e?.value) {
                  locationFormMethods.setValue("locationType", e.value);
                  openLocationModal(e.value);
                }
              }}
            />
          </div>
        )}
        {formMethods.getValues("locations").length > 0 && (
          <ul>
            {formMethods.getValues("locations").map((location) => (
              <li
                key={location.type}
                className="mb-2 rounded-sm border border-neutral-300 py-1.5 px-2 shadow-sm">
                <div className="flex justify-between">
                  {location.type === LocationType.InPerson && (
                    <div className="flex flex-grow items-center">
                      <LocationMarkerIcon className="h-6 w-6" />
                      <input
                        disabled
                        className="w-full border-0 bg-transparent text-sm ltr:ml-2 rtl:mr-2"
                        value={location.address}
                      />
                    </div>
                  )}
                  {location.type === LocationType.Phone && (
                    <div className="flex flex-grow items-center">
                      <PhoneIcon className="h-6 w-6" />
                      <span className="text-sm ltr:ml-2 rtl:mr-2">{t("phone_call")}</span>
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
                    <div className="flex flex-grow">
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
                            fillRule="evenodd"></path>
                          <path
                            id="path1"
                            d="M304.600 153.562 C 304.160 153.717,302.589 154.419,301.109 155.122 C 299.629 155.825,298.171 156.400,297.869 156.400 C 297.567 156.400,296.528 156.977,295.560 157.682 C 294.592 158.387,292.872 159.272,291.739 159.649 C 290.605 160.025,288.743 160.976,287.602 161.761 C 286.460 162.547,284.778 163.386,283.863 163.628 C 282.948 163.869,281.300 164.672,280.200 165.413 C 279.100 166.154,277.660 166.885,277.000 167.037 C 275.491 167.385,272.800 168.718,272.800 169.117 C 272.800 169.485,270.749 170.506,268.629 171.194 C 266.207 171.979,263.730 174.650,263.412 176.820 C 262.921 180.167,263.353 224.092,263.889 225.295 C 264.635 226.970,266.755 228.668,269.300 229.629 C 270.565 230.107,271.600 230.622,271.600 230.775 C 271.600 231.219,274.452 232.687,276.241 233.162 C 277.144 233.403,278.381 234.061,278.991 234.626 C 279.600 235.191,281.382 236.125,282.950 236.701 C 284.517 237.278,286.430 238.236,287.200 238.831 C 287.970 239.426,289.320 240.126,290.200 240.387 C 292.160 240.967,294.400 242.079,294.400 242.472 C 294.400 242.837,297.518 244.231,299.125 244.584 C 299.790 244.730,300.737 245.198,301.228 245.625 C 301.720 246.051,302.620 246.400,303.228 246.400 C 303.837 246.400,304.605 246.504,304.936 246.631 C 305.267 246.758,305.902 246.498,306.348 246.052 C 306.793 245.607,307.721 244.951,308.410 244.595 C 310.905 243.305,310.800 245.287,310.800 199.575 C 310.800 155.897,310.789 155.600,309.169 155.600 C 309.026 155.600,308.231 155.060,307.400 154.400 C 306.569 153.740,305.780 153.218,305.645 153.240 C 305.510 153.262,305.040 153.407,304.600 153.562 "
                            stroke="none"
                            fill="#1be7b8"
                            fillRule="evenodd"></path>
                          <path
                            id="path2"
                            d="M104.148 137.776 C 103.459 138.076,102.774 138.519,102.624 138.760 C 102.475 139.002,101.832 139.200,101.196 139.200 C 98.679 139.200,95.594 140.337,94.191 141.782 C 93.434 142.562,92.630 143.200,92.406 143.200 C 92.181 143.200,91.703 143.875,91.344 144.700 C 90.984 145.525,90.140 146.560,89.467 147.000 C 87.556 148.251,87.579 147.532,87.693 201.219 L 87.800 252.069 88.800 252.944 C 89.350 253.425,90.311 254.498,90.935 255.328 C 91.559 256.159,92.682 257.235,93.430 257.719 C 94.178 258.204,94.792 258.829,94.795 259.110 C 94.801 259.708,96.289 260.360,98.770 260.851 C 99.743 261.044,100.887 261.516,101.311 261.901 C 102.535 263.008,223.251 262.983,224.942 261.875 C 225.616 261.433,227.174 261.056,228.925 260.910 C 232.411 260.620,234.281 259.898,234.866 258.616 C 235.107 258.087,235.812 257.444,236.432 257.187 C 237.635 256.688,238.800 255.226,238.800 254.214 C 238.800 253.876,239.039 253.600,239.330 253.600 C 239.622 253.600,240.297 253.135,240.830 252.568 L 241.800 251.536 241.800 200.335 L 241.800 149.134 240.400 147.884 C 239.630 147.197,238.690 145.944,238.312 145.101 C 237.852 144.075,237.232 143.430,236.441 143.154 C 235.696 142.895,235.110 142.318,234.859 141.598 C 234.411 140.311,233.008 139.763,229.068 139.333 C 227.786 139.194,226.522 138.865,226.260 138.603 C 224.854 137.196,225.002 137.200,164.726 137.216 C 115.566 137.229,105.185 137.325,104.148 137.776 M230.299 140.581 C 231.013 140.751,232.363 141.600,233.299 142.466 C 234.235 143.333,235.488 144.338,236.085 144.699 C 236.684 145.061,237.282 145.862,237.419 146.487 C 237.556 147.110,238.076 148.110,238.574 148.710 C 240.721 151.291,240.592 148.280,240.713 198.600 C 240.829 246.814,240.750 249.650,239.248 251.152 C 238.800 251.600,238.071 252.676,237.629 253.543 C 237.187 254.410,236.187 255.514,235.407 255.995 C 234.628 256.477,233.798 257.231,233.563 257.670 C 232.125 260.355,229.256 260.458,160.200 260.300 C 96.040 260.154,98.009 260.223,96.185 258.055 C 95.663 257.435,94.598 256.495,93.818 255.964 C 93.037 255.434,92.310 254.730,92.202 254.400 C 92.094 254.070,91.396 253.117,90.652 252.283 C 88.728 250.126,88.809 252.440,88.804 199.526 C 88.800 148.835,88.746 150.246,90.767 148.075 C 91.445 147.347,92.000 146.583,92.000 146.379 C 92.000 145.965,94.367 143.600,94.781 143.600 C 94.926 143.600,95.721 142.979,96.550 142.220 C 97.645 141.217,98.567 140.772,99.928 140.589 C 100.958 140.450,101.980 140.273,102.200 140.195 C 103.020 139.904,229.052 140.284,230.299 140.581 M302.261 151.784 C 301.415 152.085,300.477 152.683,300.177 153.111 C 299.589 153.951,298.498 154.440,295.467 155.223 C 294.179 155.556,293.257 156.096,292.706 156.841 C 292.120 157.635,291.307 158.082,289.909 158.382 C 287.523 158.894,286.569 159.361,285.000 160.786 C 284.254 161.463,282.944 162.058,281.536 162.358 C 279.852 162.717,278.929 163.194,277.936 164.216 C 277.201 164.973,276.327 165.593,275.994 165.596 C 274.726 165.605,271.323 167.114,270.329 168.107 C 269.759 168.678,268.506 169.354,267.546 169.609 C 263.906 170.578,262.647 172.127,261.546 176.994 C 260.707 180.702,260.406 219.312,261.200 221.401 C 261.420 221.979,261.860 223.699,262.178 225.222 C 262.801 228.210,263.915 229.763,265.769 230.228 C 266.340 230.371,266.906 230.649,267.027 230.844 C 267.148 231.040,267.598 231.200,268.028 231.200 C 268.457 231.200,269.121 231.575,269.504 232.034 C 270.324 233.017,272.827 234.231,274.800 234.604 C 275.626 234.760,276.610 235.349,277.200 236.040 C 277.950 236.919,278.976 237.422,281.300 238.052 C 283.242 238.578,284.400 239.096,284.400 239.438 C 284.400 240.158,287.095 241.510,289.201 241.847 C 290.693 242.085,292.400 243.256,292.400 244.041 C 292.400 244.329,297.174 246.000,297.997 246.000 C 298.233 246.000,299.057 246.630,299.827 247.400 C 301.156 248.729,301.366 248.800,303.981 248.800 L 306.736 248.800 309.338 246.578 C 312.714 243.696,312.469 247.711,312.322 197.737 L 312.200 156.074 310.962 154.537 C 308.533 151.521,305.601 150.593,302.261 151.784 M307.400 154.400 C 308.231 155.060,309.026 155.600,309.169 155.600 C 310.789 155.600,310.800 155.897,310.800 199.575 C 310.800 245.287,310.905 243.305,308.410 244.595 C 307.721 244.951,306.793 245.607,306.348 246.052 C 305.902 246.498,305.267 246.758,304.936 246.631 C 304.605 246.504,303.837 246.400,303.228 246.400 C 302.620 246.400,301.720 246.051,301.228 245.625 C 300.737 245.198,299.790 244.730,299.125 244.584 C 297.518 244.231,294.400 242.837,294.400 242.472 C 294.400 242.079,292.160 240.967,290.200 240.387 C 289.320 240.126,287.970 239.426,287.200 238.831 C 286.430 238.236,284.517 237.278,282.950 236.701 C 281.382 236.125,279.600 235.191,278.991 234.626 C 278.381 234.061,277.144 233.403,276.241 233.162 C 274.452 232.687,271.600 231.219,271.600 230.775 C 271.600 230.622,270.565 230.107,269.300 229.629 C 266.755 228.668,264.635 226.970,263.889 225.295 C 263.353 224.092,262.921 180.167,263.412 176.820 C 263.730 174.650,266.207 171.979,268.629 171.194 C 270.749 170.506,272.800 169.485,272.800 169.117 C 272.800 168.718,275.491 167.385,277.000 167.037 C 277.660 166.885,279.100 166.154,280.200 165.413 C 281.300 164.672,282.948 163.869,283.863 163.628 C 284.778 163.386,286.460 162.547,287.602 161.761 C 288.743 160.976,290.605 160.025,291.739 159.649 C 292.872 159.272,294.592 158.387,295.560 157.682 C 296.528 156.977,297.567 156.400,297.869 156.400 C 298.171 156.400,299.629 155.825,301.109 155.122 C 303.608 153.934,305.049 153.337,305.645 153.240 C 305.780 153.218,306.569 153.740,307.400 154.400 "
                            stroke="none"
                            fill="#4c545c"
                            fillRule="evenodd"></path>
                          <path
                            id="path3"
                            d="M102.200 140.195 C 101.980 140.273,100.958 140.450,99.928 140.589 C 98.567 140.772,97.645 141.217,96.550 142.220 C 95.721 142.979,94.926 143.600,94.781 143.600 C 94.367 143.600,92.000 145.965,92.000 146.379 C 92.000 146.583,91.445 147.347,90.767 148.075 C 88.746 150.246,88.800 148.835,88.804 199.526 C 88.809 252.440,88.728 250.126,90.652 252.283 C 91.396 253.117,92.094 254.070,92.202 254.400 C 92.310 254.730,93.037 255.434,93.818 255.964 C 94.598 256.495,95.663 257.435,96.185 258.055 C 98.009 260.223,96.040 260.154,160.200 260.300 C 229.256 260.458,232.125 260.355,233.563 257.670 C 233.798 257.231,234.628 256.477,235.407 255.995 C 236.187 255.514,237.187 254.410,237.629 253.543 C 238.071 252.676,238.800 251.600,239.248 251.152 C 240.750 249.650,240.829 246.814,240.713 198.600 C 240.592 148.280,240.721 151.291,238.574 148.710 C 238.076 148.110,237.556 147.110,237.419 146.487 C 237.282 145.862,236.684 145.061,236.085 144.699 C 235.488 144.338,234.235 143.333,233.299 142.466 C 232.363 141.600,231.013 140.751,230.299 140.581 C 229.052 140.284,103.020 139.904,102.200 140.195 M230.466 142.277 C 231.052 142.539,231.641 143.098,231.774 143.518 C 231.907 143.938,232.893 144.759,233.964 145.342 C 235.591 146.227,235.956 146.640,236.183 147.850 C 236.332 148.647,236.610 149.591,236.799 149.949 C 238.967 154.051,238.801 149.852,238.787 200.426 C 238.776 240.392,238.696 246.704,238.187 247.376 C 237.864 247.804,237.594 248.434,237.586 248.776 C 237.579 249.119,237.225 250.120,236.800 251.000 C 236.375 251.880,236.021 252.921,236.014 253.314 C 236.005 253.774,235.357 254.304,234.197 254.801 C 233.149 255.250,232.208 255.983,231.949 256.552 C 231.099 258.418,231.741 258.400,164.273 258.400 C 94.832 258.400,98.373 258.498,97.169 256.550 C 96.710 255.808,96.107 255.200,95.829 255.200 C 95.054 255.200,93.751 253.916,93.401 252.808 C 93.229 252.262,92.571 251.334,91.940 250.744 C 90.014 248.945,89.999 248.545,90.010 199.645 C 90.020 151.390,90.024 151.267,91.919 149.613 C 92.560 149.054,93.221 148.147,93.389 147.598 C 93.802 146.248,94.776 145.200,95.616 145.200 C 95.997 145.200,96.914 144.583,97.654 143.830 C 98.394 143.076,99.630 142.280,100.400 142.062 C 102.567 141.447,229.079 141.657,230.466 142.277 "
                            stroke="none"
                            fill="#949c9c"
                            fillRule="evenodd"></path>
                          <path
                            id="path4"
                            d="M35.200 0.984 C 35.200 1.947,35.121 1.971,31.700 2.084 L 28.200 2.200 28.077 3.900 L 27.954 5.600 25.403 5.600 C 21.914 5.600,20.903 6.043,20.590 7.712 C 20.367 8.902,20.142 9.103,18.669 9.430 C 17.102 9.777,16.988 9.898,16.800 11.400 C 16.605 12.956,16.554 13.003,14.922 13.122 C 13.260 13.243,13.243 13.260,13.122 14.922 C 13.003 16.554,12.956 16.605,11.400 16.800 C 9.898 16.988,9.777 17.102,9.430 18.669 C 9.103 20.142,8.902 20.367,7.712 20.590 C 6.043 20.903,5.600 21.914,5.600 25.403 L 5.600 27.954 3.900 28.077 L 2.200 28.200 2.084 31.700 C 1.971 35.121,1.947 35.200,0.984 35.200 L 0.000 35.200 0.000 200.000 L 0.000 364.800 0.984 364.800 C 1.947 364.800,1.971 364.879,2.084 368.300 L 2.200 371.800 3.900 372.177 L 5.600 372.554 5.600 374.851 C 5.600 378.083,6.072 379.102,7.712 379.410 C 8.902 379.633,9.103 379.858,9.430 381.331 C 9.777 382.898,9.898 383.012,11.400 383.200 C 12.953 383.394,13.004 383.449,13.121 385.059 C 13.247 386.786,13.757 387.181,15.876 387.195 C 16.598 387.199,16.773 387.463,16.876 388.700 C 16.992 390.104,17.107 390.224,18.669 390.570 C 20.142 390.897,20.367 391.098,20.590 392.288 C 20.903 393.957,21.914 394.400,25.403 394.400 L 27.954 394.400 28.077 396.100 L 28.200 397.800 31.700 397.916 C 35.121 398.029,35.200 398.053,35.200 399.016 L 35.200 400.000 200.000 400.000 L 364.800 400.000 364.800 399.016 C 364.800 398.053,364.879 398.029,368.300 397.916 L 371.800 397.800 372.177 396.100 L 372.554 394.400 375.103 394.400 C 378.233 394.400,379.094 393.974,379.414 392.265 C 379.633 391.101,379.865 390.896,381.331 390.570 C 382.893 390.224,383.008 390.104,383.124 388.700 C 383.241 387.288,383.327 387.200,384.596 387.200 C 386.308 387.200,387.200 386.308,387.200 384.596 C 387.200 383.327,387.288 383.241,388.700 383.124 C 390.104 383.008,390.224 382.893,390.570 381.331 C 390.896 379.865,391.101 379.633,392.265 379.414 C 393.974 379.094,394.400 378.233,394.400 375.103 L 394.400 372.554 396.100 372.177 L 397.800 371.800 397.916 368.300 C 398.029 364.879,398.053 364.800,399.016 364.800 L 400.000 364.800 400.000 200.000 L 400.000 35.200 399.016 35.200 C 398.053 35.200,398.029 35.121,397.916 31.700 L 397.800 28.200 396.100 28.077 L 394.400 27.954 394.400 25.403 C 394.400 21.914,393.957 20.903,392.288 20.590 C 391.098 20.367,390.897 20.142,390.570 18.669 C 390.224 17.107,390.104 16.992,388.700 16.876 C 387.463 16.773,387.199 16.598,387.195 15.876 C 387.181 13.757,386.786 13.247,385.059 13.121 C 383.452 13.004,383.396 12.953,383.275 11.480 C 383.121 9.617,382.265 9.200,378.597 9.200 L 376.046 9.200 375.923 7.500 C 375.802 5.821,375.779 5.798,374.173 5.681 C 372.616 5.566,372.529 5.488,372.173 3.881 L 371.800 2.200 368.300 2.084 C 364.879 1.971,364.800 1.947,364.800 0.984 L 364.800 0.000 200.000 0.000 L 35.200 0.000 35.200 0.984 M224.918 137.663 C 225.394 137.918,225.998 138.341,226.260 138.603 C 226.522 138.865,227.786 139.194,229.068 139.333 C 233.008 139.763,234.411 140.311,234.859 141.598 C 235.110 142.318,235.696 142.895,236.441 143.154 C 237.232 143.430,237.852 144.075,238.312 145.101 C 238.690 145.944,239.630 147.197,240.400 147.884 L 241.800 149.134 241.800 200.335 L 241.800 251.536 240.830 252.568 C 240.297 253.135,239.622 253.600,239.330 253.600 C 239.039 253.600,238.800 253.876,238.800 254.214 C 238.800 255.226,237.635 256.688,236.432 257.187 C 235.812 257.444,235.107 258.087,234.866 258.616 C 234.281 259.898,232.411 260.620,228.925 260.910 C 227.174 261.056,225.616 261.433,224.942 261.875 C 223.251 262.983,102.535 263.008,101.311 261.901 C 100.887 261.516,99.743 261.044,98.770 260.851 C 96.289 260.360,94.801 259.708,94.795 259.110 C 94.792 258.829,94.178 258.204,93.430 257.719 C 92.682 257.235,91.559 256.159,90.935 255.328 C 90.311 254.498,89.350 253.425,88.800 252.944 L 87.800 252.069 87.693 201.219 C 87.579 147.532,87.556 148.251,89.467 147.000 C 90.140 146.560,90.984 145.525,91.344 144.700 C 91.703 143.875,92.181 143.200,92.406 143.200 C 92.630 143.200,93.434 142.562,94.191 141.782 C 95.594 140.337,98.679 139.200,101.196 139.200 C 101.832 139.200,102.475 139.002,102.624 138.760 C 103.575 137.222,103.193 137.232,164.726 137.216 C 208.933 137.204,224.273 137.318,224.918 137.663 M308.162 152.107 C 309.021 152.598,310.281 153.692,310.962 154.537 L 312.200 156.074 312.322 197.737 C 312.469 247.711,312.714 243.696,309.338 246.578 L 306.736 248.800 303.981 248.800 C 301.366 248.800,301.156 248.729,299.827 247.400 C 299.057 246.630,298.233 246.000,297.997 246.000 C 297.174 246.000,292.400 244.329,292.400 244.041 C 292.400 243.256,290.693 242.085,289.201 241.847 C 287.095 241.510,284.400 240.158,284.400 239.438 C 284.400 239.096,283.242 238.578,281.300 238.052 C 278.976 237.422,277.950 236.919,277.200 236.040 C 276.610 235.349,275.626 234.760,274.800 234.604 C 272.827 234.231,270.324 233.017,269.504 232.034 C 269.121 231.575,268.457 231.200,268.028 231.200 C 267.598 231.200,267.148 231.040,267.027 230.844 C 266.906 230.649,266.340 230.371,265.769 230.228 C 263.915 229.763,262.801 228.210,262.178 225.222 C 261.860 223.699,261.420 221.979,261.200 221.401 C 260.406 219.312,260.707 180.702,261.546 176.994 C 262.647 172.127,263.906 170.578,267.546 169.609 C 268.506 169.354,269.759 168.678,270.329 168.107 C 271.323 167.114,274.726 165.605,275.994 165.596 C 276.327 165.593,277.201 164.973,277.936 164.216 C 278.929 163.194,279.852 162.717,281.536 162.358 C 282.944 162.058,284.254 161.463,285.000 160.786 C 286.569 159.361,287.523 158.894,289.909 158.382 C 291.307 158.082,292.120 157.635,292.706 156.841 C 293.257 156.096,294.179 155.556,295.467 155.223 C 298.498 154.440,299.589 153.951,300.177 153.111 C 301.487 151.241,305.719 150.709,308.162 152.107 "
                            stroke="none"
                            fill="#141c24"
                            fillRule="evenodd"></path>
                        </g>
                      </svg>
                      <span className="text-sm ltr:ml-2 rtl:mr-2">Daily.co Video</span>
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
                      <span className="ml-2 text-sm">Jitsi Meet</span>
                    </div>
                  )}
                  <div className="flex">
                    <button
                      type="button"
                      onClick={() => openLocationModal(location.type)}
                      className="mr-1 p-1 text-gray-500 hover:text-gray-900">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => removeLocation(location)}>
                      <XIcon className="border-l-1 h-6 w-6 pl-1 text-gray-500 hover:text-gray-900 " />
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
                    className="flex rounded-sm px-3 py-2 hover:bg-gray-100"
                    onClick={() => setShowLocationModal(true)}>
                    <PlusIcon className="mt-0.5 h-4 w-4 text-neutral-900" />
                    <span className="ml-1 text-sm font-medium text-neutral-700">{t("add_location")}</span>
                  </button>
                </li>
              )}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div>
      <Shell
        centered
        title={t("event_type_title", { eventTypeTitle: eventType.title })}
        heading={
          <div className="group relative cursor-pointer" onClick={() => setEditIcon(false)}>
            {editIcon ? (
              <>
                <h1
                  style={{ fontSize: 22, letterSpacing: "-0.0009em" }}
                  className="inline pl-0 text-gray-900 focus:text-black group-hover:text-gray-500">
                  {eventType.title}
                </h1>
                <PencilIcon className="ml-1 -mt-1 inline h-4 w-4 text-gray-700 group-hover:text-gray-500" />
              </>
            ) : (
              <div style={{ marginBottom: -11 }}>
                <input
                  type="text"
                  autoFocus
                  style={{ top: -6, fontSize: 22 }}
                  required
                  className="relative h-10 w-full cursor-pointer border-none bg-transparent pl-0 text-gray-900 hover:text-gray-700 focus:text-black focus:outline-none focus:ring-0"
                  placeholder={t("quick_chat")}
                  {...formMethods.register("title")}
                  defaultValue={eventType.title}
                />
              </div>
            )}
          </div>
        }
        subtitle={eventType.description || ""}>
        <div className="mx-auto block sm:flex md:max-w-5xl">
          <div className="w-full ltr:mr-2 rtl:ml-2 sm:w-9/12">
            <div className="-mx-4 rounded-sm border border-neutral-200 bg-white p-4 py-6 sm:mx-0 sm:px-8">
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
                      : "",
                  });
                }}
                className="space-y-6">
                <div className="space-y-3">
                  <div className="block items-center sm:flex">
                    <div className="min-w-48 mb-4 sm:mb-0">
                      <label htmlFor="slug" className="flex text-sm font-medium text-neutral-700">
                        <LinkIcon className="mt-0.5 h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2" />
                        {t("url")}
                      </label>
                    </div>
                    <div className="w-full">
                      <div className="flex rounded-sm shadow-sm">
                        <span className="inline-flex items-center rounded-l-sm border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                          {process.env.NEXT_PUBLIC_APP_URL?.replace(/^(https?:|)\/\//, "")}/
                          {team ? "team/" + team.slug : eventType.users[0].username}/
                        </span>
                        <input
                          type="text"
                          required
                          className="focus:border-primary-500 focus:ring-primary-500 block w-full min-w-0 flex-1 rounded-none rounded-r-sm border-gray-300 sm:text-sm"
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
                            <ClockIcon className="mt-0.5 h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2" />{" "}
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
                      <label htmlFor="location" className="mt-2.5 flex text-sm font-medium text-neutral-700">
                        <LocationMarkerIcon className="mt-0.5 h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2" />
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
                      <label htmlFor="description" className="mt-0 flex text-sm font-medium text-neutral-700">
                        <DocumentIcon className="mt-0.5 h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2" />
                        {t("description")}
                      </label>
                    </div>
                    <div className="w-full">
                      <textarea
                        id="description"
                        className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-sm border-gray-300 shadow-sm sm:text-sm"
                        placeholder={t("quick_video_meeting")}
                        {...formMethods.register("description")}
                        defaultValue={asStringOrUndefined(eventType.description)}></textarea>
                    </div>
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
                          <UsersIcon className="h-5 w-5 text-neutral-500 ltr:mr-2 rtl:ml-2" />{" "}
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
                          <UserAddIcon className="h-5 w-5 text-neutral-500 ltr:mr-2 rtl:ml-2" />{" "}
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
                          advancedSettingsVisible ? "rotate-90 transform" : ""
                        } ml-auto h-5 w-5 text-neutral-500`}
                      />
                      <span className="text-sm font-medium text-neutral-700">
                        {t("show_advanced_settings")}
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 space-y-6">
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
                      <div className="block items-center sm:flex">
                        <div className="min-w-48 mb-4 sm:mb-0">
                          <label htmlFor="eventName" className="flex text-sm font-medium text-neutral-700">
                            {t("event_name")} <InfoBadge content={t("event_name_tooltip")} />
                          </label>
                        </div>
                        <div className="w-full">
                          <div className="relative mt-1 rounded-sm shadow-sm">
                            <input
                              type="text"
                              className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-sm border-gray-300 shadow-sm sm:text-sm"
                              placeholder={t("meeting_with_user")}
                              defaultValue={eventType.eventName || ""}
                              {...formMethods.register("eventName")}
                            />
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
                            <div className="relative mt-1 rounded-sm shadow-sm">
                              {
                                <input
                                  type="text"
                                  className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-sm border-gray-300 shadow-sm sm:text-sm"
                                  placeholder={t("Example: 0x71c7656ec7ab88b098defb751b7401b5f6d8976f")}
                                  defaultValue={(eventType.metadata.smartContractAddress || "") as string}
                                  {...formMethods.register("smartContractAddress")}
                                />
                              }
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
                                      <XIcon className="h-6 w-6 border-l-2 pl-1 hover:text-red-500 " />
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

                      <div className="block items-center sm:flex">
                        <div className="min-w-48 mb-4 sm:mb-0">
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
                                    className="react-select-container focus:border-primary-500 focus:ring-primary-500 block w-full min-w-0 flex-1 rounded-sm border border-gray-300 sm:text-sm"
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
                                      className="flex h-4 w-4 cursor-pointer items-center rounded-full border border-black bg-white focus:border-2 focus:outline-none ltr:mr-2 rtl:ml-2">
                                      <RadioGroup.Indicator className="relative flex h-4 w-4 items-center justify-center after:block after:h-2 after:w-2 after:rounded-full after:bg-black" />
                                    </RadioGroup.Item>
                                    {period.prefix ? <span>{period.prefix}&nbsp;</span> : null}
                                    {period.type === "ROLLING" && (
                                      <div className="inline-flex">
                                        <input
                                          type="number"
                                          className="focus:border-primary-500 focus:ring-primary-500 block w-12 rounded-sm border-gray-300 shadow-sm [appearance:textfield] ltr:mr-2 rtl:ml-2 sm:text-sm"
                                          placeholder="30"
                                          {...formMethods.register("periodDays", { valueAsNumber: true })}
                                          defaultValue={eventType.periodDays || 30}
                                        />
                                        <select
                                          id=""
                                          className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-sm border-gray-300 py-2 pl-3 pr-10 text-base focus:outline-none sm:text-sm"
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
                        <div className="min-w-48 mb-4 sm:mb-0">
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
                            <div className="min-w-48 mb-4 sm:mb-0">
                              <label
                                htmlFor="payment"
                                className="mt-2 flex text-sm font-medium text-neutral-700">
                                {t("payment")}
                              </label>
                            </div>

                            <div className="flex flex-col">
                              <div className="w-full">
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
                                          className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
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
                                  <div className="block items-center sm:flex">
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
                                              className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-sm border-gray-300 pl-2 pr-12 sm:text-sm"
                                              placeholder="Price"
                                              onChange={(e) => {
                                                field.onChange(e.target.valueAsNumber * 100);
                                              }}
                                              value={field.value > 0 ? field.value / 100 : 0}
                                            />
                                          )}
                                        />
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
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
                <div className="mt-4 flex justify-end space-x-2 rtl:space-x-reverse">
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
          <div className="mt-8 w-full min-w-[177px] px-2 ltr:ml-2 rtl:mr-2 sm:mt-0 sm:w-3/12 ">
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
                <ExternalLinkIcon className="h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2" aria-hidden="true" />
                {t("preview")}
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(permalink);
                  showToast("Link copied!", "success");
                }}
                type="button"
                className="text-md flex items-center rounded-sm px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900">
                <LinkIcon className="h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2" />
                {t("copy_link")}
              </button>
              <Dialog>
                <DialogTrigger className="text-md flex items-center rounded-sm px-2 py-1 text-sm font-medium text-neutral-700 hover:bg-gray-200 hover:text-gray-900">
                  <TrashIcon className="h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2" />
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
        <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
          <DialogContent asChild>
            <div className="inline-block transform rounded-sm bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
              <div className="mb-4 sm:flex sm:items-start">
                <div className="bg-secondary-100 mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10">
                  <LocationMarkerIcon className="text-primary-600 h-6 w-6" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                    {t("edit_location")}
                  </h3>
                  <div>
                    <p className="text-sm text-gray-400">{t("this_input_will_shown_booking_this_event")}</p>
                  </div>
                </div>
              </div>
              <Form
                form={locationFormMethods}
                handleSubmit={async (values) => {
                  const newLocation = values.locationType;

                  let details = {};
                  if (newLocation === LocationType.InPerson) {
                    details = { address: values.locationAddress };
                  }

                  const existingIdx = formMethods
                    .getValues("locations")
                    .findIndex((loc) => values.locationType === loc.type);
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
                      formMethods.getValues("locations").concat({ type: values.locationType, ...details })
                    );
                  }

                  setShowLocationModal(false);
                }}>
                <Controller
                  name="locationType"
                  control={locationFormMethods.control}
                  render={() => (
                    <Select
                      maxMenuHeight={100}
                      name="location"
                      defaultValue={selectedLocation}
                      options={locationOptions}
                      isSearchable={false}
                      classNamePrefix="react-select"
                      className="react-select-container focus:border-primary-500 focus:ring-primary-500 my-4 block w-full min-w-0 flex-1 rounded-sm border border-gray-300 sm:text-sm"
                      onChange={(val) => {
                        if (val) {
                          locationFormMethods.setValue("locationType", val.value);
                          setSelectedLocation(val);
                        }
                      }}
                    />
                  )}
                />
                <LocationOptions />
                <div className="mt-4 flex justify-end space-x-2">
                  <Button onClick={() => setShowLocationModal(false)} type="button" color="secondary">
                    {t("cancel")}
                  </Button>
                  <Button type="submit">{t("update")}</Button>
                </div>
              </Form>
            </div>
          </DialogContent>
        </Dialog>
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
                      <PlusIcon className="text-primary-600 h-6 w-6" />
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
    locationOptions.push({
      value: LocationType.Zoom,
      label: "Zoom Video",
      disabled: true,
    });
  }
  const hasPaymentIntegration = hasIntegration(integrations, "stripe_payment");
  if (hasIntegration(integrations, "google_calendar")) {
    locationOptions.push({
      value: LocationType.GoogleMeet,
      label: "Google Meet",
    });
  }
  if (hasIntegration(integrations, "daily_video")) {
    locationOptions.push({
      value: LocationType.Daily,
      label: "Daily.co Video",
    });
  }
  if (hasIntegration(integrations, "jitsi_video")) {
    locationOptions.push({
      value: LocationType.Jitsi,
      label: "Jitsi Meet",
    });
  }
  if (hasIntegration(integrations, "huddle01_video")) {
    locationOptions.push({
      value: LocationType.Huddle01,
      label: "Huddle01 Video",
    });
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
        user.avatar = `${process.env.NEXT_PUBLIC_APP_URL}/${user.username}/avatar.png`;
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
