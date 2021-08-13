import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import Select, { OptionBase } from "react-select";
import prisma from "@lib/prisma";
import { LocationType } from "@lib/location";
import Shell from "@components/Shell";
import { getSession } from "next-auth/client";
import { Scheduler } from "@components/ui/Scheduler";

import { LocationMarkerIcon, PhoneIcon, PlusCircleIcon, XIcon } from "@heroicons/react/outline";
import { EventTypeCustomInput, EventTypeCustomInputType } from "@lib/eventTypeInput";
import { PlusIcon } from "@heroicons/react/solid";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Availability, EventType, User } from "@prisma/client";
import { validJson } from "@lib/jsonUtils";
import Text from "@components/ui/Text";
import { RadioGroup } from "@headlessui/react";
import classnames from "classnames";
import throttle from "lodash.throttle";
import "react-dates/initialize";
import "react-dates/lib/css/_datepicker.css";
import { DateRangePicker, OrientationShape, toMomentObject } from "react-dates";

dayjs.extend(utc);
dayjs.extend(timezone);

type Props = {
  user: User;
  eventType: EventType;
  locationOptions: OptionBase[];
  availability: Availability[];
};

type OpeningHours = {
  days: number[];
  startTime: number;
  endTime: number;
};

type DateOverride = {
  date: string;
  startTime: number;
  endTime: number;
};

type EventTypeInput = {
  id: number;
  title: string;
  slug: string;
  description: string;
  length: number;
  hidden: boolean;
  locations: unknown;
  eventName: string;
  customInputs: EventTypeCustomInput[];
  timeZone: string;
  availability?: { openingHours: OpeningHours[]; dateOverrides: DateOverride[] };
  periodType?: string;
  periodDays?: number;
  periodStartDate?: Date | string;
  periodEndDate?: Date | string;
  periodCountCalendarDays?: boolean;
  requiresConfirmation: boolean;
  minimumBookingNotice: number;
};

const PERIOD_TYPES = [
  {
    type: "rolling",
    suffix: "into the future",
  },
  {
    type: "range",
    prefix: "Within a date range",
  },
  {
    type: "unlimited",
    prefix: "Indefinitely into the future",
  },
];

export default function EventTypePage({
  user,
  eventType,
  locationOptions,
  availability,
}: Props): JSX.Element {
  const router = useRouter();

  const inputOptions: OptionBase[] = [
    { value: EventTypeCustomInputType.Text, label: "Text" },
    { value: EventTypeCustomInputType.TextLong, label: "Multiline Text" },
    { value: EventTypeCustomInputType.Number, label: "Number" },
    { value: EventTypeCustomInputType.Bool, label: "Checkbox" },
  ];

  const [DATE_PICKER_ORIENTATION, setDatePickerOrientation] = useState<OrientationShape>("horizontal");
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });

  const handleResizeEvent = () => {
    const elementWidth = parseFloat(getComputedStyle(document.body).width);
    const elementHeight = parseFloat(getComputedStyle(document.body).height);

    setContentSize({
      width: elementWidth,
      height: elementHeight,
    });
  };

  const throttledHandleResizeEvent = throttle(handleResizeEvent, 100);

  useEffect(() => {
    handleResizeEvent();

    window.addEventListener("resize", throttledHandleResizeEvent);

    return () => {
      window.removeEventListener("resize", throttledHandleResizeEvent);
    };
  }, []);

  useEffect(() => {
    if (contentSize.width < 500) {
      setDatePickerOrientation("vertical");
    } else {
      setDatePickerOrientation("horizontal");
    }
  }, [contentSize]);

  const [enteredAvailability, setEnteredAvailability] = useState();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [selectedTimeZone, setSelectedTimeZone] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<OptionBase | undefined>(undefined);
  const [selectedInputOption, setSelectedInputOption] = useState<OptionBase>(inputOptions[0]);
  const [locations, setLocations] = useState(eventType.locations || []);
  const [selectedCustomInput, setSelectedCustomInput] = useState<EventTypeCustomInput | undefined>(undefined);
  const [customInputs, setCustomInputs] = useState<EventTypeCustomInput[]>(
    eventType.customInputs.sort((a, b) => a.id - b.id) || []
  );

  const [periodStartDate, setPeriodStartDate] = useState(() => {
    if (eventType.periodType === "range" && eventType?.periodStartDate) {
      return toMomentObject(new Date(eventType.periodStartDate));
    }

    return null;
  });

  const [periodEndDate, setPeriodEndDate] = useState(() => {
    if (eventType.periodType === "range" && eventType.periodEndDate) {
      return toMomentObject(new Date(eventType?.periodEndDate));
    }

    return null;
  });
  const [focusedInput, setFocusedInput] = useState(null);
  const [periodType, setPeriodType] = useState(() => {
    return (
      PERIOD_TYPES.find((s) => s.type === eventType.periodType) ||
      PERIOD_TYPES.find((s) => s.type === "unlimited")
    );
  });

  const titleRef = useRef<HTMLInputElement>();
  const slugRef = useRef<HTMLInputElement>();
  const descriptionRef = useRef<HTMLTextAreaElement>();
  const lengthRef = useRef<HTMLInputElement>();
  const isHiddenRef = useRef<HTMLInputElement>();
  const requiresConfirmationRef = useRef<HTMLInputElement>();
  const minimumBookingNoticeRef = useRef<HTMLInputElement>();
  const eventNameRef = useRef<HTMLInputElement>();
  const periodDaysRef = useRef<HTMLInputElement>();
  const periodDaysTypeRef = useRef<HTMLSelectElement>();

  useEffect(() => {
    setSelectedTimeZone(eventType.timeZone || user.timeZone);
  }, []);

  async function updateEventTypeHandler(event) {
    event.preventDefault();

    const enteredTitle: string = titleRef.current.value;
    const enteredSlug: string = slugRef.current.value;
    const enteredDescription: string = descriptionRef.current.value;
    const enteredLength: number = parseInt(lengthRef.current.value);
    const enteredIsHidden: boolean = isHiddenRef.current.checked;
    const enteredMinimumBookingNotice: number = parseInt(minimumBookingNoticeRef.current.value);
    const enteredRequiresConfirmation: boolean = requiresConfirmationRef.current.checked;
    const enteredEventName: string = eventNameRef.current.value;

    const type = periodType.type;
    const enteredPeriodDays = parseInt(periodDaysRef?.current?.value);
    const enteredPeriodDaysType = Boolean(parseInt(periodDaysTypeRef?.current.value));

    const enteredPeriodStartDate = periodStartDate ? periodStartDate.toDate() : null;
    const enteredPeriodEndDate = periodEndDate ? periodEndDate.toDate() : null;

    // TODO: Add validation

    const payload: EventTypeInput = {
      id: eventType.id,
      title: enteredTitle,
      slug: enteredSlug,
      description: enteredDescription,
      length: enteredLength,
      hidden: enteredIsHidden,
      locations,
      eventName: enteredEventName,
      customInputs,
      timeZone: selectedTimeZone,
      periodType: type,
      periodDays: enteredPeriodDays,
      periodStartDate: enteredPeriodStartDate,
      periodEndDate: enteredPeriodEndDate,
      periodCountCalendarDays: enteredPeriodDaysType,
      minimumBookingNotice: enteredMinimumBookingNotice,
      requiresConfirmation: enteredRequiresConfirmation,
    };

    if (enteredAvailability) {
      payload.availability = enteredAvailability;
    }

    await fetch("/api/availability/eventtype", {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
    });

    router.push("/availability");
  }

  async function deleteEventTypeHandler(event) {
    event.preventDefault();

    await fetch("/api/availability/eventtype", {
      method: "DELETE",
      body: JSON.stringify({ id: eventType.id }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    router.push("/availability");
  }

  const openLocationModal = (type: LocationType) => {
    setSelectedLocation(locationOptions.find((option) => option.value === type));
    setShowLocationModal(true);
  };

  const closeLocationModal = () => {
    setSelectedLocation(undefined);
    setShowLocationModal(false);
  };

  const closeAddCustomModal = () => {
    setSelectedInputOption(inputOptions[0]);
    setShowAddCustomModal(false);
    setSelectedCustomInput(undefined);
  };

  const updateLocations = (e) => {
    e.preventDefault();

    let details = {};
    if (e.target.location.value === LocationType.InPerson) {
      details = { address: e.target.address.value };
    }

    const existingIdx = locations.findIndex((loc) => e.target.location.value === loc.type);
    if (existingIdx !== -1) {
      const copy = locations;
      copy[existingIdx] = { ...locations[existingIdx], ...details };
      setLocations(copy);
    } else {
      setLocations(locations.concat({ type: e.target.location.value, ...details }));
    }

    setShowLocationModal(false);
  };

  const removeLocation = (selectedLocation) => {
    setLocations(locations.filter((location) => location.type !== selectedLocation.type));
  };

  const openEditCustomModel = (customInput: EventTypeCustomInput) => {
    setSelectedCustomInput(customInput);
    setSelectedInputOption(inputOptions.find((e) => e.value === customInput.type));
    setShowAddCustomModal(true);
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
              Set an address or place
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="address"
                id="address"
                required
                className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
                defaultValue={locations.find((location) => location.type === LocationType.InPerson)?.address}
              />
            </div>
          </div>
        );
      case LocationType.Phone:
        return (
          <p className="text-sm">Calendso will ask your invitee to enter a phone number before scheduling.</p>
        );
      case LocationType.GoogleMeet:
        return <p className="text-sm">Calendso will provide a Google Meet location.</p>;
      case LocationType.Daily:
          return <p className="text-sm">Calendso will provide a Daily meeting URL.</p>;
      case LocationType.Zoom:
        return <p className="text-sm">Calendso will provide a Zoom meeting URL.</p>;
    }
    return null;
  };

  const updateCustom = (e) => {
    e.preventDefault();

    const customInput: EventTypeCustomInput = {
      label: e.target.label.value,
      required: e.target.required.checked,
      type: e.target.type.value,
    };

    if (e.target.id?.value) {
      const index = customInputs.findIndex((inp) => inp.id === +e.target.id?.value);
      if (index >= 0) {
        const input = customInputs[index];
        input.label = customInput.label;
        input.required = customInput.required;
        input.type = customInput.type;
        setCustomInputs(customInputs);
      }
    } else {
      setCustomInputs(customInputs.concat(customInput));
    }
    closeAddCustomModal();
  };

  const removeCustom = (customInput, e) => {
    e.preventDefault();
    const index = customInputs.findIndex((inp) => inp.id === customInput.id);
    if (index >= 0) {
      customInputs.splice(index, 1);
      setCustomInputs([...customInputs]);
    }
  };

  return (
    <div>
      <Head>
        <title>{eventType.title} | Event Type | Calendso</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Shell heading={"Event Type - " + eventType.title}>
        <div className="max-w-5xl mx-auto">
          <div className="">
            <div className="bg-white overflow-hidden shadow rounded-lg mb-4">
              <div className="px-4 py-5 sm:p-6">
                <form onSubmit={updateEventTypeHandler}>
                  <div className="mb-4">
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                      Title
                    </label>
                    <div className="mt-1">
                      <input
                        ref={titleRef}
                        type="text"
                        name="title"
                        id="title"
                        required
                        className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="Quick Chat"
                        defaultValue={eventType.title}
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                      URL
                    </label>
                    <div className="mt-1">
                      <div className="flex rounded-md shadow-sm">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                          {typeof location !== "undefined" ? location.hostname : ""}/{user.username}/
                        </span>
                        <input
                          ref={slugRef}
                          type="text"
                          name="slug"
                          id="slug"
                          required
                          className="flex-1 block w-full focus:ring-black focus:border-black min-w-0 rounded-none rounded-r-md sm:text-sm border-gray-300"
                          defaultValue={eventType.slug}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                      Location
                    </label>
                    {locations.length === 0 && (
                      <div className="mt-1 mb-2">
                        <div className="flex rounded-md shadow-sm">
                          <Select
                            name="location"
                            id="location"
                            options={locationOptions}
                            isSearchable="false"
                            classNamePrefix="react-select"
                            className="react-select-container rounded-sm border border-gray-300 flex-1 block w-full focus:ring-primary-500 focus:border-primary-500 min-w-0 sm:text-sm"
                            onChange={(e) => openLocationModal(e.value)}
                          />
                        </div>
                      </div>
                    )}
                    {locations.length > 0 && (
                      <ul className="mt-1">
                        {locations.map((location) => (
                          <li key={location.type} className="bg-blue-50 mb-2 p-2 border">
                            <div className="flex justify-between">
                              {location.type === LocationType.InPerson && (
                                <div className="flex-grow flex">
                                  <LocationMarkerIcon className="h-6 w-6" />
                                  <span className="ml-2 text-sm">{location.address}</span>
                                </div>
                              )}
                              {location.type === LocationType.Phone && (
                                <div className="flex-grow flex">
                                  <PhoneIcon className="h-6 w-6" />
                                  <span className="ml-2 text-sm">Phone call</span>
                                </div>
                              )}
                              {location.type === LocationType.Daily && (
                                <div className="flex-grow flex">
                                  <svg id="svg" 
                                  version="1.1" 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  width="1.25em" 
                                  height="1.25em" 
                                  viewBox="0, 0, 400,400">
                                    <g id="svgg">
                                    <path id="path0" d="M100.400 142.062 C 99.630 142.280,98.394 143.076,97.654 143.830 C 96.914 144.583,95.997 145.200,95.616 145.200 C 94.776 145.200,93.802 146.248,93.389 147.598 C 93.221 148.147,92.560 149.054,91.919 149.613 C 90.024 151.267,90.020 151.390,90.010 199.645 C 89.999 248.545,90.014 248.945,91.940 250.744 C 92.571 251.334,93.229 252.262,93.401 252.808 C 93.751 253.916,95.054 255.200,95.829 255.200 C 96.107 255.200,96.710 255.808,97.169 256.550 C 98.373 258.498,94.832 258.400,164.273 258.400 C 231.741 258.400,231.099 258.418,231.949 256.552 C 232.208 255.983,233.149 255.250,234.197 254.801 C 235.357 254.304,236.005 253.774,236.014 253.314 C 236.021 252.921,236.375 251.880,236.800 251.000 C 237.225 250.120,237.579 249.119,237.586 248.776 C 237.594 248.434,237.864 247.804,238.187 247.376 C 238.696 246.704,238.776 240.392,238.787 200.426 C 238.801 149.852,238.967 154.051,236.799 149.949 C 236.610 149.591,236.332 148.647,236.183 147.850 C 235.956 146.640,235.591 146.227,233.964 145.342 C 232.893 144.759,231.907 143.938,231.774 143.518 C 231.641 143.098,231.052 142.539,230.466 142.277 C 229.079 141.657,102.567 141.447,100.400 142.062 " 
                                    stroke="none" 
                                    fill="#f9f9f9" 
                                    fill-rule="evenodd">
                                    </path>
                                    <path id="path1" d="M304.600 153.562 C 304.160 153.717,302.589 154.419,301.109 155.122 C 299.629 155.825,298.171 156.400,297.869 156.400 C 297.567 156.400,296.528 156.977,295.560 157.682 C 294.592 158.387,292.872 159.272,291.739 159.649 C 290.605 160.025,288.743 160.976,287.602 161.761 C 286.460 162.547,284.778 163.386,283.863 163.628 C 282.948 163.869,281.300 164.672,280.200 165.413 C 279.100 166.154,277.660 166.885,277.000 167.037 C 275.491 167.385,272.800 168.718,272.800 169.117 C 272.800 169.485,270.749 170.506,268.629 171.194 C 266.207 171.979,263.730 174.650,263.412 176.820 C 262.921 180.167,263.353 224.092,263.889 225.295 C 264.635 226.970,266.755 228.668,269.300 229.629 C 270.565 230.107,271.600 230.622,271.600 230.775 C 271.600 231.219,274.452 232.687,276.241 233.162 C 277.144 233.403,278.381 234.061,278.991 234.626 C 279.600 235.191,281.382 236.125,282.950 236.701 C 284.517 237.278,286.430 238.236,287.200 238.831 C 287.970 239.426,289.320 240.126,290.200 240.387 C 292.160 240.967,294.400 242.079,294.400 242.472 C 294.400 242.837,297.518 244.231,299.125 244.584 C 299.790 244.730,300.737 245.198,301.228 245.625 C 301.720 246.051,302.620 246.400,303.228 246.400 C 303.837 246.400,304.605 246.504,304.936 246.631 C 305.267 246.758,305.902 246.498,306.348 246.052 C 306.793 245.607,307.721 244.951,308.410 244.595 C 310.905 243.305,310.800 245.287,310.800 199.575 C 310.800 155.897,310.789 155.600,309.169 155.600 C 309.026 155.600,308.231 155.060,307.400 154.400 C 306.569 153.740,305.780 153.218,305.645 153.240 C 305.510 153.262,305.040 153.407,304.600 153.562 " stroke="none" fill="#1be7b8" fill-rule="evenodd"></path><path id="path2" d="M104.148 137.776 C 103.459 138.076,102.774 138.519,102.624 138.760 C 102.475 139.002,101.832 139.200,101.196 139.200 C 98.679 139.200,95.594 140.337,94.191 141.782 C 93.434 142.562,92.630 143.200,92.406 143.200 C 92.181 143.200,91.703 143.875,91.344 144.700 C 90.984 145.525,90.140 146.560,89.467 147.000 C 87.556 148.251,87.579 147.532,87.693 201.219 L 87.800 252.069 88.800 252.944 C 89.350 253.425,90.311 254.498,90.935 255.328 C 91.559 256.159,92.682 257.235,93.430 257.719 C 94.178 258.204,94.792 258.829,94.795 259.110 C 94.801 259.708,96.289 260.360,98.770 260.851 C 99.743 261.044,100.887 261.516,101.311 261.901 C 102.535 263.008,223.251 262.983,224.942 261.875 C 225.616 261.433,227.174 261.056,228.925 260.910 C 232.411 260.620,234.281 259.898,234.866 258.616 C 235.107 258.087,235.812 257.444,236.432 257.187 C 237.635 256.688,238.800 255.226,238.800 254.214 C 238.800 253.876,239.039 253.600,239.330 253.600 C 239.622 253.600,240.297 253.135,240.830 252.568 L 241.800 251.536 241.800 200.335 L 241.800 149.134 240.400 147.884 C 239.630 147.197,238.690 145.944,238.312 145.101 C 237.852 144.075,237.232 143.430,236.441 143.154 C 235.696 142.895,235.110 142.318,234.859 141.598 C 234.411 140.311,233.008 139.763,229.068 139.333 C 227.786 139.194,226.522 138.865,226.260 138.603 C 224.854 137.196,225.002 137.200,164.726 137.216 C 115.566 137.229,105.185 137.325,104.148 137.776 M230.299 140.581 C 231.013 140.751,232.363 141.600,233.299 142.466 C 234.235 143.333,235.488 144.338,236.085 144.699 C 236.684 145.061,237.282 145.862,237.419 146.487 C 237.556 147.110,238.076 148.110,238.574 148.710 C 240.721 151.291,240.592 148.280,240.713 198.600 C 240.829 246.814,240.750 249.650,239.248 251.152 C 238.800 251.600,238.071 252.676,237.629 253.543 C 237.187 254.410,236.187 255.514,235.407 255.995 C 234.628 256.477,233.798 257.231,233.563 257.670 C 232.125 260.355,229.256 260.458,160.200 260.300 C 96.040 260.154,98.009 260.223,96.185 258.055 C 95.663 257.435,94.598 256.495,93.818 255.964 C 93.037 255.434,92.310 254.730,92.202 254.400 C 92.094 254.070,91.396 253.117,90.652 252.283 C 88.728 250.126,88.809 252.440,88.804 199.526 C 88.800 148.835,88.746 150.246,90.767 148.075 C 91.445 147.347,92.000 146.583,92.000 146.379 C 92.000 145.965,94.367 143.600,94.781 143.600 C 94.926 143.600,95.721 142.979,96.550 142.220 C 97.645 141.217,98.567 140.772,99.928 140.589 C 100.958 140.450,101.980 140.273,102.200 140.195 C 103.020 139.904,229.052 140.284,230.299 140.581 M302.261 151.784 C 301.415 152.085,300.477 152.683,300.177 153.111 C 299.589 153.951,298.498 154.440,295.467 155.223 C 294.179 155.556,293.257 156.096,292.706 156.841 C 292.120 157.635,291.307 158.082,289.909 158.382 C 287.523 158.894,286.569 159.361,285.000 160.786 C 284.254 161.463,282.944 162.058,281.536 162.358 C 279.852 162.717,278.929 163.194,277.936 164.216 C 277.201 164.973,276.327 165.593,275.994 165.596 C 274.726 165.605,271.323 167.114,270.329 168.107 C 269.759 168.678,268.506 169.354,267.546 169.609 C 263.906 170.578,262.647 172.127,261.546 176.994 C 260.707 180.702,260.406 219.312,261.200 221.401 C 261.420 221.979,261.860 223.699,262.178 225.222 C 262.801 228.210,263.915 229.763,265.769 230.228 C 266.340 230.371,266.906 230.649,267.027 230.844 C 267.148 231.040,267.598 231.200,268.028 231.200 C 268.457 231.200,269.121 231.575,269.504 232.034 C 270.324 233.017,272.827 234.231,274.800 234.604 C 275.626 234.760,276.610 235.349,277.200 236.040 C 277.950 236.919,278.976 237.422,281.300 238.052 C 283.242 238.578,284.400 239.096,284.400 239.438 C 284.400 240.158,287.095 241.510,289.201 241.847 C 290.693 242.085,292.400 243.256,292.400 244.041 C 292.400 244.329,297.174 246.000,297.997 246.000 C 298.233 246.000,299.057 246.630,299.827 247.400 C 301.156 248.729,301.366 248.800,303.981 248.800 L 306.736 248.800 309.338 246.578 C 312.714 243.696,312.469 247.711,312.322 197.737 L 312.200 156.074 310.962 154.537 C 308.533 151.521,305.601 150.593,302.261 151.784 M307.400 154.400 C 308.231 155.060,309.026 155.600,309.169 155.600 C 310.789 155.600,310.800 155.897,310.800 199.575 C 310.800 245.287,310.905 243.305,308.410 244.595 C 307.721 244.951,306.793 245.607,306.348 246.052 C 305.902 246.498,305.267 246.758,304.936 246.631 C 304.605 246.504,303.837 246.400,303.228 246.400 C 302.620 246.400,301.720 246.051,301.228 245.625 C 300.737 245.198,299.790 244.730,299.125 244.584 C 297.518 244.231,294.400 242.837,294.400 242.472 C 294.400 242.079,292.160 240.967,290.200 240.387 C 289.320 240.126,287.970 239.426,287.200 238.831 C 286.430 238.236,284.517 237.278,282.950 236.701 C 281.382 236.125,279.600 235.191,278.991 234.626 C 278.381 234.061,277.144 233.403,276.241 233.162 C 274.452 232.687,271.600 231.219,271.600 230.775 C 271.600 230.622,270.565 230.107,269.300 229.629 C 266.755 228.668,264.635 226.970,263.889 225.295 C 263.353 224.092,262.921 180.167,263.412 176.820 C 263.730 174.650,266.207 171.979,268.629 171.194 C 270.749 170.506,272.800 169.485,272.800 169.117 C 272.800 168.718,275.491 167.385,277.000 167.037 C 277.660 166.885,279.100 166.154,280.200 165.413 C 281.300 164.672,282.948 163.869,283.863 163.628 C 284.778 163.386,286.460 162.547,287.602 161.761 C 288.743 160.976,290.605 160.025,291.739 159.649 C 292.872 159.272,294.592 158.387,295.560 157.682 C 296.528 156.977,297.567 156.400,297.869 156.400 C 298.171 156.400,299.629 155.825,301.109 155.122 C 303.608 153.934,305.049 153.337,305.645 153.240 C 305.780 153.218,306.569 153.740,307.400 154.400 " stroke="none" fill="#4c545c" fill-rule="evenodd"></path><path id="path3" d="M102.200 140.195 C 101.980 140.273,100.958 140.450,99.928 140.589 C 98.567 140.772,97.645 141.217,96.550 142.220 C 95.721 142.979,94.926 143.600,94.781 143.600 C 94.367 143.600,92.000 145.965,92.000 146.379 C 92.000 146.583,91.445 147.347,90.767 148.075 C 88.746 150.246,88.800 148.835,88.804 199.526 C 88.809 252.440,88.728 250.126,90.652 252.283 C 91.396 253.117,92.094 254.070,92.202 254.400 C 92.310 254.730,93.037 255.434,93.818 255.964 C 94.598 256.495,95.663 257.435,96.185 258.055 C 98.009 260.223,96.040 260.154,160.200 260.300 C 229.256 260.458,232.125 260.355,233.563 257.670 C 233.798 257.231,234.628 256.477,235.407 255.995 C 236.187 255.514,237.187 254.410,237.629 253.543 C 238.071 252.676,238.800 251.600,239.248 251.152 C 240.750 249.650,240.829 246.814,240.713 198.600 C 240.592 148.280,240.721 151.291,238.574 148.710 C 238.076 148.110,237.556 147.110,237.419 146.487 C 237.282 145.862,236.684 145.061,236.085 144.699 C 235.488 144.338,234.235 143.333,233.299 142.466 C 232.363 141.600,231.013 140.751,230.299 140.581 C 229.052 140.284,103.020 139.904,102.200 140.195 M230.466 142.277 C 231.052 142.539,231.641 143.098,231.774 143.518 C 231.907 143.938,232.893 144.759,233.964 145.342 C 235.591 146.227,235.956 146.640,236.183 147.850 C 236.332 148.647,236.610 149.591,236.799 149.949 C 238.967 154.051,238.801 149.852,238.787 200.426 C 238.776 240.392,238.696 246.704,238.187 247.376 C 237.864 247.804,237.594 248.434,237.586 248.776 C 237.579 249.119,237.225 250.120,236.800 251.000 C 236.375 251.880,236.021 252.921,236.014 253.314 C 236.005 253.774,235.357 254.304,234.197 254.801 C 233.149 255.250,232.208 255.983,231.949 256.552 C 231.099 258.418,231.741 258.400,164.273 258.400 C 94.832 258.400,98.373 258.498,97.169 256.550 C 96.710 255.808,96.107 255.200,95.829 255.200 C 95.054 255.200,93.751 253.916,93.401 252.808 C 93.229 252.262,92.571 251.334,91.940 250.744 C 90.014 248.945,89.999 248.545,90.010 199.645 C 90.020 151.390,90.024 151.267,91.919 149.613 C 92.560 149.054,93.221 148.147,93.389 147.598 C 93.802 146.248,94.776 145.200,95.616 145.200 C 95.997 145.200,96.914 144.583,97.654 143.830 C 98.394 143.076,99.630 142.280,100.400 142.062 C 102.567 141.447,229.079 141.657,230.466 142.277 " stroke="none" fill="#949c9c" fill-rule="evenodd"></path><path id="path4" d="M35.200 0.984 C 35.200 1.947,35.121 1.971,31.700 2.084 L 28.200 2.200 28.077 3.900 L 27.954 5.600 25.403 5.600 C 21.914 5.600,20.903 6.043,20.590 7.712 C 20.367 8.902,20.142 9.103,18.669 9.430 C 17.102 9.777,16.988 9.898,16.800 11.400 C 16.605 12.956,16.554 13.003,14.922 13.122 C 13.260 13.243,13.243 13.260,13.122 14.922 C 13.003 16.554,12.956 16.605,11.400 16.800 C 9.898 16.988,9.777 17.102,9.430 18.669 C 9.103 20.142,8.902 20.367,7.712 20.590 C 6.043 20.903,5.600 21.914,5.600 25.403 L 5.600 27.954 3.900 28.077 L 2.200 28.200 2.084 31.700 C 1.971 35.121,1.947 35.200,0.984 35.200 L 0.000 35.200 0.000 200.000 L 0.000 364.800 0.984 364.800 C 1.947 364.800,1.971 364.879,2.084 368.300 L 2.200 371.800 3.900 372.177 L 5.600 372.554 5.600 374.851 C 5.600 378.083,6.072 379.102,7.712 379.410 C 8.902 379.633,9.103 379.858,9.430 381.331 C 9.777 382.898,9.898 383.012,11.400 383.200 C 12.953 383.394,13.004 383.449,13.121 385.059 C 13.247 386.786,13.757 387.181,15.876 387.195 C 16.598 387.199,16.773 387.463,16.876 388.700 C 16.992 390.104,17.107 390.224,18.669 390.570 C 20.142 390.897,20.367 391.098,20.590 392.288 C 20.903 393.957,21.914 394.400,25.403 394.400 L 27.954 394.400 28.077 396.100 L 28.200 397.800 31.700 397.916 C 35.121 398.029,35.200 398.053,35.200 399.016 L 35.200 400.000 200.000 400.000 L 364.800 400.000 364.800 399.016 C 364.800 398.053,364.879 398.029,368.300 397.916 L 371.800 397.800 372.177 396.100 L 372.554 394.400 375.103 394.400 C 378.233 394.400,379.094 393.974,379.414 392.265 C 379.633 391.101,379.865 390.896,381.331 390.570 C 382.893 390.224,383.008 390.104,383.124 388.700 C 383.241 387.288,383.327 387.200,384.596 387.200 C 386.308 387.200,387.200 386.308,387.200 384.596 C 387.200 383.327,387.288 383.241,388.700 383.124 C 390.104 383.008,390.224 382.893,390.570 381.331 C 390.896 379.865,391.101 379.633,392.265 379.414 C 393.974 379.094,394.400 378.233,394.400 375.103 L 394.400 372.554 396.100 372.177 L 397.800 371.800 397.916 368.300 C 398.029 364.879,398.053 364.800,399.016 364.800 L 400.000 364.800 400.000 200.000 L 400.000 35.200 399.016 35.200 C 398.053 35.200,398.029 35.121,397.916 31.700 L 397.800 28.200 396.100 28.077 L 394.400 27.954 394.400 25.403 C 394.400 21.914,393.957 20.903,392.288 20.590 C 391.098 20.367,390.897 20.142,390.570 18.669 C 390.224 17.107,390.104 16.992,388.700 16.876 C 387.463 16.773,387.199 16.598,387.195 15.876 C 387.181 13.757,386.786 13.247,385.059 13.121 C 383.452 13.004,383.396 12.953,383.275 11.480 C 383.121 9.617,382.265 9.200,378.597 9.200 L 376.046 9.200 375.923 7.500 C 375.802 5.821,375.779 5.798,374.173 5.681 C 372.616 5.566,372.529 5.488,372.173 3.881 L 371.800 2.200 368.300 2.084 C 364.879 1.971,364.800 1.947,364.800 0.984 L 364.800 0.000 200.000 0.000 L 35.200 0.000 35.200 0.984 M224.918 137.663 C 225.394 137.918,225.998 138.341,226.260 138.603 C 226.522 138.865,227.786 139.194,229.068 139.333 C 233.008 139.763,234.411 140.311,234.859 141.598 C 235.110 142.318,235.696 142.895,236.441 143.154 C 237.232 143.430,237.852 144.075,238.312 145.101 C 238.690 145.944,239.630 147.197,240.400 147.884 L 241.800 149.134 241.800 200.335 L 241.800 251.536 240.830 252.568 C 240.297 253.135,239.622 253.600,239.330 253.600 C 239.039 253.600,238.800 253.876,238.800 254.214 C 238.800 255.226,237.635 256.688,236.432 257.187 C 235.812 257.444,235.107 258.087,234.866 258.616 C 234.281 259.898,232.411 260.620,228.925 260.910 C 227.174 261.056,225.616 261.433,224.942 261.875 C 223.251 262.983,102.535 263.008,101.311 261.901 C 100.887 261.516,99.743 261.044,98.770 260.851 C 96.289 260.360,94.801 259.708,94.795 259.110 C 94.792 258.829,94.178 258.204,93.430 257.719 C 92.682 257.235,91.559 256.159,90.935 255.328 C 90.311 254.498,89.350 253.425,88.800 252.944 L 87.800 252.069 87.693 201.219 C 87.579 147.532,87.556 148.251,89.467 147.000 C 90.140 146.560,90.984 145.525,91.344 144.700 C 91.703 143.875,92.181 143.200,92.406 143.200 C 92.630 143.200,93.434 142.562,94.191 141.782 C 95.594 140.337,98.679 139.200,101.196 139.200 C 101.832 139.200,102.475 139.002,102.624 138.760 C 103.575 137.222,103.193 137.232,164.726 137.216 C 208.933 137.204,224.273 137.318,224.918 137.663 M308.162 152.107 C 309.021 152.598,310.281 153.692,310.962 154.537 L 312.200 156.074 312.322 197.737 C 312.469 247.711,312.714 243.696,309.338 246.578 L 306.736 248.800 303.981 248.800 C 301.366 248.800,301.156 248.729,299.827 247.400 C 299.057 246.630,298.233 246.000,297.997 246.000 C 297.174 246.000,292.400 244.329,292.400 244.041 C 292.400 243.256,290.693 242.085,289.201 241.847 C 287.095 241.510,284.400 240.158,284.400 239.438 C 284.400 239.096,283.242 238.578,281.300 238.052 C 278.976 237.422,277.950 236.919,277.200 236.040 C 276.610 235.349,275.626 234.760,274.800 234.604 C 272.827 234.231,270.324 233.017,269.504 232.034 C 269.121 231.575,268.457 231.200,268.028 231.200 C 267.598 231.200,267.148 231.040,267.027 230.844 C 266.906 230.649,266.340 230.371,265.769 230.228 C 263.915 229.763,262.801 228.210,262.178 225.222 C 261.860 223.699,261.420 221.979,261.200 221.401 C 260.406 219.312,260.707 180.702,261.546 176.994 C 262.647 172.127,263.906 170.578,267.546 169.609 C 268.506 169.354,269.759 168.678,270.329 168.107 C 271.323 167.114,274.726 165.605,275.994 165.596 C 276.327 165.593,277.201 164.973,277.936 164.216 C 278.929 163.194,279.852 162.717,281.536 162.358 C 282.944 162.058,284.254 161.463,285.000 160.786 C 286.569 159.361,287.523 158.894,289.909 158.382 C 291.307 158.082,292.120 157.635,292.706 156.841 C 293.257 156.096,294.179 155.556,295.467 155.223 C 298.498 154.440,299.589 153.951,300.177 153.111 C 301.487 151.241,305.719 150.709,308.162 152.107 " stroke="none" fill="#141c24" fill-rule="evenodd"></path></g></svg>
                                  <span className="ml-2 text-sm">Daily Video</span>
                                </div>
                              )}
                              {location.type === LocationType.GoogleMeet && (
                                <div className="flex-grow flex">
                                  <svg
                                    className="h-6 w-6"
                                    stroke="currentColor"
                                    fill="currentColor"
                                    strokeWidth="0"
                                    role="img"
                                    viewBox="0 0 24 24"
                                    height="1em"
                                    width="1em"
                                    xmlns="http://www.w3.org/2000/svg">
                                    <title></title>
                                    <path d="M12 0C6.28 0 1.636 4.641 1.636 10.364c0 5.421 4.945 9.817 10.364 9.817V24c6.295-3.194 10.364-8.333 10.364-13.636C22.364 4.64 17.72 0 12 0zM7.5 6.272h6.817a1.363 1.363 0 0 1 1.365 1.365v1.704l2.728-2.727v7.501l-2.726-2.726v1.703a1.362 1.362 0 0 1-1.365 1.365H7.5c-.35 0-.698-.133-.965-.4a1.358 1.358 0 0 1-.4-.965V7.637A1.362 1.362 0 0 1 7.5 6.272Z"></path>
                                  </svg>
                                  <span className="ml-2 text-sm">Google Meet</span>
                                </div>
                              )}
                              {location.type === LocationType.Zoom && (
                                <div className="flex-grow flex">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 1329.08 1329.08"
                                    height="1.25em"
                                    width="1.25em"
                                    shapeRendering="geometricPrecision"
                                    textRendering="geometricPrecision"
                                    imageRendering="optimizeQuality"
                                    fillRule="evenodd"
                                    clipRule="evenodd">
                                    <g id="Layer_x0020_1">
                                      <g id="_2116467169744">
                                        <path
                                          d="M664.54 0c367.02 0 664.54 297.52 664.54 664.54s-297.52 664.54-664.54 664.54S0 1031.56 0 664.54 297.52 0 664.54 0z"
                                          fill="#e5e5e4"
                                          fillRule="nonzero"
                                        />
                                        <path
                                          style={{
                                            fill: "#fff",
                                            fillRule: "nonzero",
                                          }}
                                          d="M664.54 12.94c359.87 0 651.6 291.73 651.6 651.6s-291.73 651.6-651.6 651.6-651.6-291.73-651.6-651.6 291.74-651.6 651.6-651.6z"
                                        />
                                        <path
                                          d="M664.54 65.21c331 0 599.33 268.33 599.33 599.33 0 331-268.33 599.33-599.33 599.33-331 0-599.33-268.33-599.33-599.33 0-331 268.33-599.33 599.33-599.33z"
                                          fill="#4a8cff"
                                          fillRule="nonzero"
                                        />
                                        <path
                                          style={{
                                            fill: "#fff",
                                            fillRule: "nonzero",
                                          }}
                                          d="M273.53 476.77v281.65c.25 63.69 52.27 114.95 115.71 114.69h410.55c11.67 0 21.06-9.39 21.06-20.81V570.65c-.25-63.69-52.27-114.95-115.7-114.69H294.6c-11.67 0-21.06 9.39-21.06 20.81zm573.45 109.87l169.5-123.82c14.72-12.18 26.13-9.14 26.13 12.94v377.56c0 25.12-13.96 22.08-26.13 12.94l-169.5-123.57V586.64z"
                                        />
                                      </g>
                                    </g>
                                  </svg>
                                  <span className="ml-2 text-sm">Zoom Video</span>
                                </div>
                              )}
                              <div className="flex">
                                <button
                                  type="button"
                                  onClick={() => openLocationModal(location.type)}
                                  className="mr-2 text-sm text-blue-600">
                                  Edit
                                </button>
                                <button onClick={() => removeLocation(location)}>
                                  <XIcon className="h-6 w-6 border-l-2 pl-1 hover:text-red-500 " />
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                        {locations.length > 0 && locations.length !== locationOptions.length && (
                          <li>
                            <button
                              type="button"
                              className="sm:flex sm:items-start text-sm text-blue-600"
                              onClick={() => setShowLocationModal(true)}>
                              <PlusCircleIcon className="h-6 w-6" />
                              <span className="ml-1">Add another location option</span>
                            </button>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                  <div className="mb-4">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <div className="mt-1">
                      <textarea
                        ref={descriptionRef}
                        name="description"
                        id="description"
                        className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="A quick video meeting."
                        defaultValue={eventType.description}></textarea>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="eventName" className="block text-sm font-medium text-gray-700">
                      Calendar entry name
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        ref={eventNameRef}
                        type="text"
                        name="title"
                        id="title"
                        className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="Meeting with {USER}"
                        defaultValue={eventType.eventName}
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="additionalFields" className="block text-sm font-medium text-gray-700">
                      Additional Inputs
                    </label>
                    <ul className="w-96 mt-1">
                      {customInputs.map((customInput) => (
                        <li key={customInput.label} className="bg-blue-50 mb-2 p-2 border">
                          <div className="flex justify-between">
                            <div>
                              <div>
                                <span className="ml-2 text-sm">Label: {customInput.label}</span>
                              </div>
                              <div>
                                <span className="ml-2 text-sm">Type: {customInput.type}</span>
                              </div>
                              <div>
                                <span className="ml-2 text-sm">
                                  {customInput.required ? "Required" : "Optional"}
                                </span>
                              </div>
                            </div>
                            <div className="flex">
                              <button
                                type="button"
                                onClick={() => openEditCustomModel(customInput)}
                                className="mr-2 text-sm text-blue-600">
                                Edit
                              </button>
                              <button onClick={(e) => removeCustom(customInput, e)}>
                                <XIcon className="h-6 w-6 border-l-2 pl-1 hover:text-red-500 " />
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                      <li>
                        <button
                          type="button"
                          className="sm:flex sm:items-start text-sm text-blue-600"
                          onClick={() => setShowAddCustomModal(true)}>
                          <PlusCircleIcon className="h-6 w-6" />
                          <span className="ml-1">Add another input</span>
                        </button>
                      </li>
                    </ul>
                  </div>
                  <div className="my-8">
                    <div className="relative flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          ref={isHiddenRef}
                          id="ishidden"
                          name="ishidden"
                          type="checkbox"
                          className="focus:ring-black h-4 w-4 text-blue-600 border-gray-300 rounded"
                          defaultChecked={eventType.hidden}
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="ishidden" className="font-medium text-gray-700">
                          Hide this event type
                        </label>
                        <p className="text-gray-500">
                          Hide the event type from your page, so it can only be booked through its URL.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="my-8">
                    <div className="relative flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          ref={requiresConfirmationRef}
                          id="requiresConfirmation"
                          name="requiresConfirmation"
                          type="checkbox"
                          className="focus:ring-black h-4 w-4 text-blue-600 border-gray-300 rounded"
                          defaultChecked={eventType.requiresConfirmation}
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="requiresConfirmation" className="font-medium text-gray-700">
                          Booking requires manual confirmation
                        </label>
                        <p className="text-gray-500">
                          The booking needs to be confirmed, before it is pushed to the integrations and a
                          confirmation mail is sent.
                        </p>
                      </div>
                    </div>
                  </div>

                  <fieldset className="my-8">
                    <Text variant="largetitle">When can people book this event?</Text>
                    <div className="my-4">
                      <label htmlFor="minimumAdvance" className="block text-sm font-medium text-gray-700">
                        Minimum booking notice
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          ref={minimumBookingNoticeRef}
                          type="number"
                          name="minimumAdvance"
                          id="minimumAdvance"
                          required
                          className="focus:ring-black focus:border-black block w-full pr-20 sm:text-sm border-gray-300 rounded-md"
                          defaultValue={eventType.minimumBookingNotice}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 text-sm">
                          minutes
                        </div>
                      </div>
                    </div>
                    <hr className="my-8" />
                    <section className="space-y-12">
                      <div className="mb-4">
                        {/* <label htmlFor="period" className=""> */}
                        <Text variant="subtitle">Date Range</Text>
                        {/* </label> */}
                        <Text variant="title3">Invitees can schedule...</Text>
                        <div className="mt-1 relative ">
                          <RadioGroup value={periodType} onChange={setPeriodType}>
                            <RadioGroup.Label className="sr-only">Date Range</RadioGroup.Label>
                            <div className="bg-white rounded-md -space-y-px">
                              {PERIOD_TYPES.map((period) => (
                                <RadioGroup.Option
                                  key={period.type}
                                  value={period}
                                  className={({ checked }) =>
                                    classnames(
                                      checked ? "bg-indigo-50 border-indigo-200 z-10" : "border-gray-200",
                                      "relative py-4 px-2 lg:p-4 min-h-20 lg:flex items-center cursor-pointer focus:outline-none"
                                    )
                                  }>
                                  {({ active, checked }) => (
                                    <>
                                      <span
                                        className={classnames(
                                          checked
                                            ? "bg-indigo-600 border-transparent"
                                            : "bg-white border-gray-300",
                                          active ? "ring-2 ring-offset-2 ring-indigo-500" : "",
                                          "h-4 w-4 mt-0.5 cursor-pointer rounded-full border flex items-center justify-center"
                                        )}
                                        aria-hidden="true">
                                        <span className="rounded-full bg-white w-1.5 h-1.5" />
                                      </span>
                                      <div className="lg:ml-3 flex flex-col">
                                        <RadioGroup.Label
                                          as="span"
                                          className={classnames(
                                            checked ? "text-indigo-900" : "text-gray-900",
                                            "block text-sm font-light space-y-2 lg:space-y-0 lg:space-x-2"
                                          )}>
                                          <span>{period.prefix}</span>
                                          {period.type === "rolling" && (
                                            <div className="inline-flex">
                                              <input
                                                ref={periodDaysRef}
                                                type="text"
                                                name="periodDays"
                                                id=""
                                                className="shadow-sm focus:ring-black focus:border-indigo-500 block w-12 sm:text-sm border-gray-300 rounded-md"
                                                placeholder="30"
                                                defaultValue={eventType.periodDays || 30}
                                              />
                                              <select
                                                ref={periodDaysTypeRef}
                                                id=""
                                                name="periodDaysType"
                                                className=" block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-black focus:border-indigo-500 sm:text-sm rounded-md"
                                                defaultValue={eventType.periodCountCalendarDays ? "1" : "0"}>
                                                <option value="1">calendar days</option>
                                                <option value="0">business days</option>
                                              </select>
                                            </div>
                                          )}

                                          {checked && period.type === "range" && (
                                            <div className="inline-flex space-x-2">
                                              <DateRangePicker
                                                orientation={DATE_PICKER_ORIENTATION}
                                                startDate={periodStartDate}
                                                startDateId="your_unique_start_date_id"
                                                endDate={periodEndDate}
                                                endDateId="your_unique_end_date_id"
                                                onDatesChange={({ startDate, endDate }) => {
                                                  setPeriodStartDate(startDate);
                                                  setPeriodEndDate(endDate);
                                                }}
                                                focusedInput={focusedInput}
                                                onFocusChange={(focusedInput) => {
                                                  setFocusedInput(focusedInput);
                                                }}
                                              />
                                            </div>
                                          )}

                                          <span>{period.suffix}</span>
                                        </RadioGroup.Label>
                                      </div>
                                    </>
                                  )}
                                </RadioGroup.Option>
                              ))}
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                      <hr className="my-8" />
                      <div className="mb-4">
                        <label htmlFor="length" className="block text-sm font-medium text-gray-700">
                          <Text variant="caption">Duration</Text>
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            ref={lengthRef}
                            type="number"
                            name="length"
                            id="length"
                            required
                            className="focus:ring-black focus:border-black block w-full pr-20 sm:text-sm border-gray-300 rounded-md"
                            placeholder="15"
                            defaultValue={eventType.length}
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 text-sm">
                            minutes
                          </div>
                        </div>
                      </div>
                      <hr className="my-8" />
                      <div>
                        <h3 className="mb-2">
                          How do you want to offer your availability for this event type?
                        </h3>
                        <Scheduler
                          setAvailability={setEnteredAvailability}
                          setTimeZone={setSelectedTimeZone}
                          timeZone={selectedTimeZone}
                          availability={availability}
                        />
                        <div className="py-4 flex justify-end">
                          <Link href="/availability">
                            <a className="mr-2 btn btn-white">Cancel</a>
                          </Link>
                          <button type="submit" className="btn btn-primary">
                            Update
                          </button>
                        </div>
                      </div>
                    </section>
                  </fieldset>
                </form>
              </div>
            </div>
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg mb-2 leading-6 font-medium text-gray-900">Delete this event type</h3>
                <div className="mb-4 max-w-xl text-sm text-gray-500">
                  <p>Once you delete this event type, it will be permanently removed.</p>
                </div>
                <div>
                  <button
                    onClick={deleteEventTypeHandler}
                    type="button"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm">
                    Delete event type
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {showLocationModal && (
          <div
            className="fixed z-50 inset-0 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 z-0 bg-opacity-75 transition-opacity"
                aria-hidden="true"></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="sm:flex sm:items-start mb-4">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <LocationMarkerIcon className="h-6 w-6 text-black" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Edit location
                    </h3>
                  </div>
                </div>
                <form onSubmit={updateLocations}>
                  <Select
                    name="location"
                    defaultValue={selectedLocation}
                    options={locationOptions}
                    isSearchable="false"
                    className="mb-2 flex-1 block w-full focus:ring-black focus:border-black min-w-0 rounded-none rounded-r-md sm:text-sm border-gray-300"
                    onChange={setSelectedLocation}
                  />
                  <LocationOptions />
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button type="submit" className="btn btn-primary">
                      Update
                    </button>
                    <button onClick={closeLocationModal} type="button" className="btn btn-white mr-2">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        {showAddCustomModal && (
          <div
            className="fixed z-50 inset-0 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 z-0 bg-opacity-75 transition-opacity"
                aria-hidden="true"
              />

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="sm:flex sm:items-start mb-4">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <PlusIcon className="h-6 w-6 text-black" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Add new custom input field
                    </h3>
                    <div>
                      <p className="text-sm text-gray-400">
                        This input will be shown when booking this event
                      </p>
                    </div>
                  </div>
                </div>
                <form onSubmit={updateCustom}>
                  <div className="mb-2">
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                      Input type
                    </label>
                    <Select
                      name="type"
                      defaultValue={selectedInputOption}
                      options={inputOptions}
                      isSearchable="false"
                      required
                      className="react-select-container border border-gray-300 rounded-sm  mb-2 flex-1 block w-full focus:ring-black focus:border-black min-w-0 sm:text-sm mt-1"
                      onChange={setSelectedInputOption}
                    />
                  </div>
                  <div className="mb-2">
                    <label htmlFor="label" className="block text-sm font-medium text-gray-700">
                      Label
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="label"
                        id="label"
                        required
                        className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
                        defaultValue={selectedCustomInput?.label}
                      />
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      id="required"
                      name="required"
                      type="checkbox"
                      className="focus:ring-black h-4 w-4 text-blue-600 border-gray-300 rounded mr-2"
                      defaultChecked={selectedCustomInput?.required ?? true}
                    />
                    <label htmlFor="required" className="block text-sm font-medium text-gray-700">
                      Is required
                    </label>
                  </div>
                  <input type="hidden" name="id" id="id" value={selectedCustomInput?.id} />
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button type="submit" className="btn btn-primary">
                      Save
                    </button>
                    <button onClick={closeAddCustomModal} type="button" className="btn btn-white mr-2">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </Shell>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, query }) => {
  const session = await getSession({ req });
  if (!session) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }

  const user: User = await prisma.user.findFirst({
    where: {
      email: session.user.email,
    },
    select: {
      username: true,
      timeZone: true,
      startTime: true,
      endTime: true,
      availability: true,
    },
  });

  const eventType: EventType | null = await prisma.eventType.findUnique({
    where: {
      id: parseInt(query.type as string),
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
      periodDays: true,
      periodStartDate: true,
      periodEndDate: true,
      periodCountCalendarDays: true,
      requiresConfirmation: true,
      minimumBookingNotice: true,
    },
  });

  if (!eventType) {
    return {
      notFound: true,
    };
  }

  const credentials = await prisma.credential.findMany({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      type: true,
      key: true,
    },
  });

  const integrations = [
    {
      installed: !!(process.env.GOOGLE_API_CREDENTIALS && validJson(process.env.GOOGLE_API_CREDENTIALS)),
      enabled: credentials.find((integration) => integration.type === "google_calendar") != null,
      type: "google_calendar",
      title: "Google Calendar",
      imageSrc: "integrations/google-calendar.svg",
      description: "For personal and business accounts",
    },
    {
      installed: !!(process.env.MS_GRAPH_CLIENT_ID && process.env.MS_GRAPH_CLIENT_SECRET),
      type: "office365_calendar",
      enabled: credentials.find((integration) => integration.type === "office365_calendar") != null,
      title: "Office 365 / Outlook.com Calendar",
      imageSrc: "integrations/outlook.svg",
      description: "For personal and business accounts",
    },
    {
      installed: !!(process.env.DAILY_API_KEY ),
      type: "daily_video",
      enabled: process.env.DAILY_API_KEY != null,
      title: "Daily Video Chat and Conferencing",
      imageSrc: "integrations/daily_video.svg",
      description: "Video Conferencing",
    },
  ];

  const locationOptions: OptionBase[] = [
    { value: LocationType.InPerson, label: "In-person meeting" },
    { value: LocationType.Phone, label: "Phone call" },
    { value: LocationType.Zoom, label: "Zoom Video" },
  ];

  const hasDailyIntegration = integrations.find(
    (i) => i.type === "daily_video" && i.installed === true
  );
  if (hasDailyIntegration) {
    locationOptions.push({ value: LocationType.Daily, label: "Daily Video" });
  }

  const hasGoogleCalendarIntegration = integrations.find(
    (i) => i.type === "google_calendar" && i.installed === true && i.enabled
  );
  if (hasGoogleCalendarIntegration) {
    locationOptions.push({ value: LocationType.GoogleMeet, label: "Google Meet" });
  }

  const hasOfficeIntegration = integrations.find(
    (i) => i.type === "office365_calendar" && i.installed === true && i.enabled
  );
  if (hasOfficeIntegration) {
    // TODO: Add default meeting option of the office integration.
    // Assuming it's Microsoft Teams.
  }

  const getAvailability = (providesAvailability) =>
    providesAvailability.availability && providesAvailability.availability.length
      ? providesAvailability.availability
      : null;

  const availability: Availability[] = getAvailability(eventType) ||
    getAvailability(user) || [
      {
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: user.startTime,
        endTime: user.endTime,
      },
    ];

  availability.sort((a, b) => a.startTime - b.startTime);

  const eventTypeObject = Object.assign({}, eventType, {
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
  });

  return {
    props: {
      user,
      eventType: eventTypeObject,
      locationOptions,
      availability,
    },
  };
};
