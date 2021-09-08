import { useRouter } from "next/router";
import Modal from "@components/Modal";
import React, { useEffect, useRef, useState } from "react";
import Select, { OptionTypeBase } from "react-select";
import prisma from "@lib/prisma";
import { EventTypeCustomInput, EventTypeCustomInputType } from "@prisma/client";
import { LocationType } from "@lib/location";
import Shell from "@components/Shell";
import { getSession } from "@lib/auth";
import { Scheduler } from "@components/ui/Scheduler";
import { Disclosure, RadioGroup } from "@headlessui/react";
import { PhoneIcon, XIcon } from "@heroicons/react/outline";
import {
  LocationMarkerIcon,
  LinkIcon,
  PlusIcon,
  DocumentIcon,
  ChevronRightIcon,
  ClockIcon,
  TrashIcon,
  ExternalLinkIcon,
} from "@heroicons/react/solid";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Availability } from "@prisma/client";
import { validJson } from "@lib/jsonUtils";
import classnames from "classnames";
import throttle from "lodash.throttle";
import "react-dates/initialize";
import "react-dates/lib/css/_datepicker.css";
import { DateRangePicker, OrientationShape, toMomentObject } from "react-dates";
import Switch from "@components/ui/Switch";
import { Dialog, DialogTrigger } from "@components/Dialog";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import { GetServerSidePropsContext } from "next";
import { useMutation } from "react-query";
import { EventTypeInput } from "@lib/types/event-type";
import updateEventType from "@lib/mutations/event-types/update-event-type";
import deleteEventType from "@lib/mutations/event-types/delete-event-type";
import showToast from "@lib/notification";
import { inferSSRProps } from "@lib/types/inferSSRProps";
import { asStringOrThrow } from "@lib/asStringOrNull";
import Button from "@components/ui/Button";

dayjs.extend(utc);
dayjs.extend(timezone);

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

const EventTypePage = (props: inferSSRProps<typeof getServerSideProps>) => {
  const { user, eventType, locationOptions, availability } = props;
  const router = useRouter();
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const inputOptions: OptionTypeBase[] = [
    { value: EventTypeCustomInputType.TEXT, label: "Text" },
    { value: EventTypeCustomInputType.TEXTLONG, label: "Multiline Text" },
    { value: EventTypeCustomInputType.NUMBER, label: "Number" },
    { value: EventTypeCustomInputType.BOOL, label: "Checkbox" },
  ];

  const [DATE_PICKER_ORIENTATION, setDatePickerOrientation] = useState<OrientationShape>("horizontal");
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });

  const updateMutation = useMutation(updateEventType, {
    onSuccess: async ({ eventType }) => {
      await router.push("/event-types");
      showToast(`${eventType.title} event type updated successfully`, "success");
    },
    onError: (err: Error) => {
      showToast(err.message, "error");
    },
  });

  const deleteMutation = useMutation(deleteEventType, {
    onSuccess: async () => {
      await router.push("/event-types");
      showToast("Event type deleted successfully", "success");
    },
    onError: (err: Error) => {
      showToast(err.message, "error");
    },
  });

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
  const [selectedLocation, setSelectedLocation] = useState<OptionTypeBase | undefined>(undefined);
  const [selectedInputOption, setSelectedInputOption] = useState<OptionTypeBase>(inputOptions[0]);
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

  const [hidden, setHidden] = useState<boolean>(eventType.hidden);
  const titleRef = useRef<HTMLInputElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const lengthRef = useRef<HTMLInputElement>(null);
  const requiresConfirmationRef = useRef<HTMLInputElement>(null);
  const eventNameRef = useRef<HTMLInputElement>(null);
  const periodDaysRef = useRef<HTMLInputElement>(null);
  const periodDaysTypeRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    setSelectedTimeZone(eventType.timeZone || user.timeZone);
  }, []);

  async function updateEventTypeHandler(event) {
    event.preventDefault();

    const enteredTitle: string = titleRef.current.value;
    const enteredSlug: string = slugRef.current.value;
    const enteredDescription: string = descriptionRef.current.value;
    const enteredLength: number = parseInt(lengthRef.current.value);

    const advancedOptionsPayload: AdvancedOptions = {};
    if (requiresConfirmationRef.current) {
      advancedOptionsPayload.requiresConfirmation = requiresConfirmationRef.current.checked;
      advancedOptionsPayload.eventName = eventNameRef.current.value;
      advancedOptionsPayload.periodType = periodType.type;
      advancedOptionsPayload.periodDays = parseInt(periodDaysRef?.current?.value);
      advancedOptionsPayload.periodCountCalendarDays = Boolean(parseInt(periodDaysTypeRef?.current.value));
      advancedOptionsPayload.periodStartDate = periodStartDate ? periodStartDate.toDate() : null;
      advancedOptionsPayload.periodEndDate = periodEndDate ? periodEndDate.toDate() : null;
    }

    const payload: EventTypeInput = {
      id: eventType.id,
      title: enteredTitle,
      slug: enteredSlug,
      description: enteredDescription,
      length: enteredLength,
      hidden,
      locations,
      customInputs,
      timeZone: selectedTimeZone,
      availability: enteredAvailability || null,
      ...advancedOptionsPayload,
    };

    updateMutation.mutate(payload);
  }

  async function deleteEventTypeHandler(event) {
    event.preventDefault();

    const payload = { id: eventType.id };
    deleteMutation.mutate(payload);
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

  const closeSuccessModal = () => {
    setSuccessModalOpen(false);
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
                className="block w-full border-gray-300 rounded-sm shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
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
      case LocationType.Zoom:
        return <p className="text-sm">Calendso will provide a Zoom meeting URL.</p>;
    }
    return null;
  };

  const updateCustom = (e) => {
    e.preventDefault();

    const customInput: EventTypeCustomInput = {
      label: e.target.label.value,
      placeholder: e.target.placeholder?.value,
      required: e.target.required.checked,
      type: e.target.type.value,
    };

    if (selectedCustomInput) {
      selectedCustomInput.label = customInput.label;
      selectedCustomInput.placeholder = customInput.placeholder;
      selectedCustomInput.required = customInput.required;
      selectedCustomInput.type = customInput.type;
    } else {
      setCustomInputs(customInputs.concat(customInput));
    }
    closeAddCustomModal();
  };

  const removeCustom = (index: number) => {
    customInputs.splice(index, 1);
    setCustomInputs([...customInputs]);
  };

  return (
    <div>
      <Shell
        title={`${eventType.title} | Event Type`}
        heading={
          <input
            ref={titleRef}
            type="text"
            name="title"
            id="title"
            required
            className="pl-0 text-xl font-bold text-gray-900 bg-transparent border-none cursor-pointer focus:ring-0 focus:outline-none"
            placeholder="Quick Chat"
            defaultValue={eventType.title}
          />
        }
        subtitle={eventType.description}>
        <div className="block sm:flex">
          <div className="w-full mr-2 sm:w-10/12">
            <div className="p-4 -mx-4 bg-white border rounded-sm border-neutral-200 sm:mx-0 sm:p-8">
              <form onSubmit={updateEventTypeHandler} className="space-y-4">
                <div className="items-center block sm:flex">
                  <div className="mb-4 min-w-44 sm:mb-0">
                    <label htmlFor="slug" className="flex mt-0 text-sm font-medium text-neutral-700">
                      <LinkIcon className="w-4 h-4 mr-2 mt-0.5 text-neutral-500" />
                      URL
                    </label>
                  </div>
                  <div className="w-full">
                    <div className="flex rounded-sm shadow-sm">
                      <span className="inline-flex items-center px-3 text-gray-500 border border-r-0 border-gray-300 rounded-l-sm bg-gray-50 sm:text-sm">
                        {typeof location !== "undefined" ? location.hostname : ""}/{user.username}/
                      </span>
                      <input
                        ref={slugRef}
                        type="text"
                        name="slug"
                        id="slug"
                        required
                        className="flex-1 block w-full min-w-0 border-gray-300 rounded-none rounded-r-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        defaultValue={eventType.slug}
                      />
                    </div>
                  </div>
                </div>

                <div className="items-center block sm:flex">
                  <div className="mb-4 min-w-44 sm:mb-0">
                    <label htmlFor="length" className="flex mt-0 text-sm font-medium text-neutral-700">
                      <ClockIcon className="w-4 h-4 mr-2 mt-0.5 text-neutral-500" />
                      Duration
                    </label>
                  </div>
                  <div className="w-full">
                    <div className="relative mt-1 rounded-sm shadow-sm">
                      <input
                        ref={lengthRef}
                        type="number"
                        name="length"
                        id="length"
                        required
                        className="block w-full pl-2 pr-12 border-gray-300 rounded-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        placeholder="15"
                        defaultValue={eventType.length}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500 sm:text-sm" id="duration">
                          mins
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <hr />

                <div className="items-center block sm:flex">
                  <div className="mb-4 min-w-44 sm:mb-0">
                    <label htmlFor="location" className="flex mt-0 text-sm font-medium text-neutral-700">
                      <LocationMarkerIcon className="w-4 h-4 mr-2 mt-0.5 text-neutral-500" />
                      Location
                    </label>
                  </div>
                  <div className="w-full">
                    {locations.length === 0 && (
                      <div className="mt-1 mb-2">
                        <div className="flex">
                          <Select
                            name="location"
                            id="location"
                            options={locationOptions}
                            isSearchable="false"
                            classNamePrefix="react-select"
                            className="flex-1 block w-full min-w-0 border border-gray-300 rounded-sm react-select-container focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            onChange={(e) => openLocationModal(e.value)}
                          />
                        </div>
                      </div>
                    )}
                    {locations.length > 0 && (
                      <ul className="mt-1">
                        {locations.map((location) => (
                          <li
                            key={location.type}
                            className="p-2 mb-2 border rounded-sm shadow-sm border-neutral-300">
                            <div className="flex justify-between">
                              {location.type === LocationType.InPerson && (
                                <div className="flex items-center flex-grow">
                                  <LocationMarkerIcon className="w-6 h-6" />
                                  <span className="ml-2 text-sm">{location.address}</span>
                                </div>
                              )}
                              {location.type === LocationType.Phone && (
                                <div className="flex items-center flex-grow">
                                  <PhoneIcon className="w-6 h-6" />
                                  <span className="ml-2 text-sm">Phone call</span>
                                </div>
                              )}
                              {location.type === LocationType.GoogleMeet && (
                                <div className="flex items-center flex-grow">
                                  <svg
                                    className="w-6 h-6"
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

                                  <span className="ml-2 text-sm">Google Meet</span>
                                </div>
                              )}
                              {location.type === LocationType.Zoom && (
                                <div className="flex items-center flex-grow">
                                  <svg
                                    className="w-6 h-6"
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
                                  <span className="ml-2 text-sm">Zoom Video</span>
                                </div>
                              )}
                              <div className="flex">
                                <button
                                  type="button"
                                  onClick={() => openLocationModal(location.type)}
                                  className="mr-2 text-sm text-primary-600">
                                  Edit
                                </button>
                                <button onClick={() => removeLocation(location)}>
                                  <XIcon className="w-6 h-6 pl-1 border-l-2 hover:text-red-500 " />
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                        {locations.length > 0 && locations.length !== locationOptions.length && (
                          <li>
                            <button
                              type="button"
                              className="flex px-3 py-2 rounded-sm bg-neutral-100"
                              onClick={() => setShowLocationModal(true)}>
                              <PlusIcon className="h-4 w-4 mt-0.5 text-neutral-900" />
                              <span className="ml-1 text-sm font-medium text-neutral-700">
                                Add another location
                              </span>
                            </button>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>

                <hr className="border-neutral-200" />

                <div className="items-center block sm:flex">
                  <div className="mb-4 min-w-44 sm:mb-0">
                    <label htmlFor="description" className="flex mt-0 text-sm font-medium text-neutral-700">
                      <DocumentIcon className="w-4 h-4 mr-2 mt-0.5 text-neutral-500" />
                      Description
                    </label>
                  </div>
                  <div className="w-full">
                    <textarea
                      ref={descriptionRef}
                      name="description"
                      id="description"
                      className="block w-full border-gray-300 rounded-sm shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="A quick video meeting."
                      defaultValue={eventType.description}></textarea>
                  </div>
                </div>
                <Disclosure>
                  {({ open }) => (
                    <>
                      <Disclosure.Button className="flex w-full">
                        <ChevronRightIcon
                          className={`${open ? "transform rotate-90" : ""} w-5 h-5 text-neutral-500 ml-auto`}
                        />
                        <span className="text-sm font-medium text-neutral-700">Show advanced settings</span>
                      </Disclosure.Button>
                      <Disclosure.Panel className="space-y-4">
                        <div className="items-center block sm:flex">
                          <div className="mb-4 min-w-44 sm:mb-0">
                            <label
                              htmlFor="eventName"
                              className="flex mt-2 text-sm font-medium text-neutral-700">
                              Event name
                            </label>
                          </div>
                          <div className="w-full">
                            <div className="relative mt-1 rounded-sm shadow-sm">
                              <input
                                ref={eventNameRef}
                                type="text"
                                name="title"
                                id="title"
                                className="block w-full border-gray-300 rounded-sm shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                placeholder="Meeting with {USER}"
                                defaultValue={eventType.eventName}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="items-center block sm:flex">
                          <div className="mb-4 min-w-44 sm:mb-0">
                            <label
                              htmlFor="additionalFields"
                              className="flex mt-2 text-sm font-medium text-neutral-700">
                              Additional inputs
                            </label>
                          </div>
                          <div className="w-full">
                            <ul className="mt-1 w-96">
                              {customInputs.map((customInput: EventTypeCustomInput, idx: number) => (
                                <li key={idx} className="p-2 mb-2 border bg-secondary-50">
                                  <div className="flex justify-between">
                                    <div>
                                      <div>
                                        <span className="ml-2 text-sm">Label: {customInput.label}</span>
                                      </div>
                                      {customInput.placeholder && (
                                        <div>
                                          <span className="ml-2 text-sm">
                                            Placeholder: {customInput.placeholder}
                                          </span>
                                        </div>
                                      )}
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
                                        className="mr-2 text-sm text-primary-600">
                                        Edit
                                      </button>
                                      <button type="button" onClick={() => removeCustom(idx)}>
                                        <XIcon className="w-6 h-6 pl-1 border-l-2 hover:text-red-500 " />
                                      </button>
                                    </div>
                                  </div>
                                </li>
                              ))}
                              <li>
                                <button
                                  type="button"
                                  className="flex px-3 py-2 rounded-sm bg-neutral-100"
                                  onClick={() => setShowAddCustomModal(true)}>
                                  <PlusIcon className="h-4 w-4 mt-0.5 text-neutral-900" />
                                  <span className="ml-1 text-sm font-medium text-neutral-700">
                                    Add an input
                                  </span>
                                </button>
                              </li>
                            </ul>
                          </div>
                        </div>
                        <div className="items-center block sm:flex">
                          <div className="mb-4 min-w-44 sm:mb-0">
                            <label
                              htmlFor="requiresConfirmation"
                              className="flex text-sm font-medium text-neutral-700">
                              Opt-in booking
                            </label>
                          </div>
                          <div className="w-full">
                            <div className="relative flex items-start">
                              <div className="flex items-center h-5">
                                <input
                                  ref={requiresConfirmationRef}
                                  id="requiresConfirmation"
                                  name="requiresConfirmation"
                                  type="checkbox"
                                  className="w-4 h-4 border-gray-300 rounded focus:ring-primary-500 text-primary-600"
                                  defaultChecked={eventType.requiresConfirmation}
                                />
                              </div>
                              <div className="ml-3 text-sm">
                                <p className="text-neutral-900">
                                  The booking needs to be manually confirmed before it is pushed to the
                                  integrations and a confirmation mail is sent.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <hr className="border-neutral-200" />

                        <div className="block sm:flex">
                          <div className="mb-4 min-w-44 sm:mb-0">
                            <label
                              htmlFor="inviteesCanSchedule"
                              className="flex mt-2 text-sm font-medium text-neutral-700">
                              Invitees can schedule
                            </label>
                          </div>
                          <div className="w-full">
                            <RadioGroup value={periodType} onChange={setPeriodType}>
                              <RadioGroup.Label className="sr-only">Date Range</RadioGroup.Label>
                              <div>
                                {PERIOD_TYPES.map((period) => (
                                  <RadioGroup.Option
                                    key={period.type}
                                    value={period}
                                    className={({ checked }) =>
                                      classnames(
                                        checked ? "border-secondary-200 z-10" : "border-gray-200",
                                        "relative min-h-14 flex items-center cursor-pointer focus:outline-none"
                                      )
                                    }>
                                    {({ active, checked }) => (
                                      <>
                                        <div
                                          className={classnames(
                                            checked
                                              ? "bg-primary-600 border-transparent"
                                              : "bg-white border-gray-300",
                                            active ? "ring-2 ring-offset-2 ring-primary-500" : "",
                                            "h-4 w-4 mt-0.5 mr-2 cursor-pointer rounded-full border items-center justify-center"
                                          )}
                                          aria-hidden="true">
                                          <span className="rounded-full bg-white w-1.5 h-1.5" />
                                        </div>
                                        <div className="flex flex-col lg:ml-3">
                                          <RadioGroup.Label
                                            as="span"
                                            className={classnames(
                                              checked ? "text-secondary-900" : "text-gray-900",
                                              "block text-sm space-y-2 lg:space-y-0 lg:space-x-2"
                                            )}>
                                            <span>{period.prefix}</span>
                                            {period.type === "rolling" && (
                                              <div className="inline-flex">
                                                <input
                                                  ref={periodDaysRef}
                                                  type="text"
                                                  name="periodDays"
                                                  id=""
                                                  className="block w-12 mr-2 border-gray-300 rounded-sm shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                                  placeholder="30"
                                                  defaultValue={eventType.periodDays || 30}
                                                />
                                                <select
                                                  ref={periodDaysTypeRef}
                                                  id=""
                                                  name="periodDaysType"
                                                  className="block w-full py-2 pl-3 pr-10 text-base border-gray-300 rounded-sm  focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                                  defaultValue={
                                                    eventType.periodCountCalendarDays ? "1" : "0"
                                                  }>
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

                        <hr className="border-neutral-200" />

                        <div className="block sm:flex">
                          <div className="mb-4 min-w-44 sm:mb-0">
                            <label
                              htmlFor="availability"
                              className="flex mt-2 text-sm font-medium text-neutral-700">
                              Availability
                            </label>
                          </div>
                          <div className="w-full">
                            <Scheduler
                              setAvailability={setEnteredAvailability}
                              setTimeZone={setSelectedTimeZone}
                              timeZone={selectedTimeZone}
                              availability={availability}
                            />
                          </div>
                        </div>
                      </Disclosure.Panel>
                    </>
                  )}
                </Disclosure>
                <div className="flex justify-end mt-4 space-x-2">
                  <Button href="/event-types" color="secondary" tabIndex={-1}>
                    Cancel
                  </Button>
                  <Button type="submit">Update</Button>
                </div>
              </form>
              <Modal
                heading="Event Type updated successfully"
                description="Your event type has been updated successfully."
                open={successModalOpen}
                handleClose={closeSuccessModal}
              />
            </div>
          </div>
          <div className="w-full px-4 mt-8 ml-2 sm:w-2/12 sm:mt-0 min-w-32">
            <div className="space-y-4">
              <Switch
                name="isHidden"
                defaultChecked={hidden}
                onCheckedChange={setHidden}
                label="Hide event type"
              />
              <a
                href={"/" + user.username + "/" + eventType.slug}
                target="_blank"
                rel="noreferrer"
                className="flex font-medium text-md text-neutral-700">
                <ExternalLinkIcon className="w-4 h-4 mt-1 mr-2 text-neutral-500" aria-hidden="true" />
                Preview
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    window.location.hostname + "/" + user.username + "/" + eventType.slug
                  );
                  showToast("Link copied!", "success");
                }}
                type="button"
                className="flex font-medium text-md text-neutral-700">
                <LinkIcon className="w-4 h-4 mt-1 mr-2 text-neutral-500" />
                Copy link
              </button>
              <Dialog>
                <DialogTrigger className="flex font-medium text-md text-neutral-700">
                  <TrashIcon className="w-4 h-4 mt-1 mr-2 text-neutral-500" />
                  Delete
                </DialogTrigger>
                <ConfirmationDialogContent
                  variety="danger"
                  title="Delete Event Type"
                  confirmBtnText="Yes, delete event type"
                  onConfirm={deleteEventTypeHandler}>
                  Are you sure you want to delete this event type? Anyone who you&apos;ve shared this link
                  with will no longer be able to book using it.
                </ConfirmationDialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        {showLocationModal && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true">
            <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 z-0 transition-opacity bg-gray-500 bg-opacity-75"
                aria-hidden="true"></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              <div className="inline-block px-4 pt-5 pb-4 text-left align-bottom transition-all transform bg-white rounded-sm shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="mb-4 sm:flex sm:items-start">
                  <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto rounded-full bg-secondary-100 sm:mx-0 sm:h-10 sm:w-10">
                    <LocationMarkerIcon className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
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
                    classNamePrefix="react-select"
                    className="flex-1 block w-full min-w-0 my-4 border border-gray-300 rounded-sm react-select-container focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    onChange={setSelectedLocation}
                  />
                  <LocationOptions />
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button type="submit" className="btn btn-primary">
                      Update
                    </button>
                    <button onClick={closeLocationModal} type="button" className="mr-2 btn btn-white">
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
            className="fixed inset-0 z-50 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true">
            <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 z-0 transition-opacity bg-gray-500 bg-opacity-75"
                aria-hidden="true"
              />

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              <div className="inline-block px-4 pt-5 pb-4 text-left align-bottom transition-all transform bg-white rounded-sm shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="mb-4 sm:flex sm:items-start">
                  <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto rounded-full bg-secondary-100 sm:mx-0 sm:h-10 sm:w-10">
                    <PlusIcon className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
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
                      className="flex-1 block w-full min-w-0 mt-1 mb-2 border-gray-300 rounded-none focus:ring-primary-500 focus:border-primary-500 rounded-r-md sm:text-sm"
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
                        className="block w-full border-gray-300 rounded-sm shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        defaultValue={selectedCustomInput?.label}
                      />
                    </div>
                  </div>
                  {(selectedInputOption.value === EventTypeCustomInputType.TEXT ||
                    selectedInputOption.value === EventTypeCustomInputType.TEXTLONG) && (
                    <div className="mb-2">
                      <label htmlFor="placeholder" className="block text-sm font-medium text-gray-700">
                        Placeholder
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="placeholder"
                          id="placeholder"
                          className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-sm"
                          defaultValue={selectedCustomInput?.placeholder}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center h-5">
                    <input
                      id="required"
                      name="required"
                      type="checkbox"
                      className="w-4 h-4 mr-2 border-gray-300 rounded focus:ring-primary-500 text-primary-600"
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
                    <button onClick={closeAddCustomModal} type="button" className="mr-2 btn btn-white">
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
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, query } = context;
  const session = await getSession({ req });
  const typeParam = asStringOrThrow(query.type);

  if (!session?.user?.id) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      username: true,
      timeZone: true,
      startTime: true,
      endTime: true,
      availability: true,
      plan: true,
    },
  });

  if (!user) {
    return {
      notFound: true,
    } as const;
  }

  const eventType = await prisma.eventType.findFirst({
    where: {
      userId: user.id,
      OR: [
        {
          slug: typeParam,
        },
        {
          id: parseInt(typeParam),
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
      periodDays: true,
      periodStartDate: true,
      periodEndDate: true,
      periodCountCalendarDays: true,
      requiresConfirmation: true,
      userId: true,
    },
  });

  if (!eventType) {
    return {
      notFound: true,
    } as const;
  }

  if (eventType.userId != session.user.id) {
    return {
      notFound: true,
    } as const;
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
  ];

  const locationOptions: OptionTypeBase[] = [
    { value: LocationType.InPerson, label: "In-person meeting" },
    { value: LocationType.Phone, label: "Phone call" },
    { value: LocationType.Zoom, label: "Zoom Video", disabled: true },
  ];

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

export default EventTypePage;
