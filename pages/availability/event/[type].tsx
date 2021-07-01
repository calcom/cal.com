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

import { LocationMarkerIcon, PlusCircleIcon, XIcon, PhoneIcon } from "@heroicons/react/outline";
import { EventTypeCustomInput, EventTypeCustomInputType } from "@lib/eventTypeInput";
import { PlusIcon } from "@heroicons/react/solid";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
import timezone from "dayjs/plugin/timezone";
import { EventType, User, Availability } from "@prisma/client";
import { validJson } from "@lib/jsonUtils";
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
};

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

  const titleRef = useRef<HTMLInputElement>();
  const slugRef = useRef<HTMLInputElement>();
  const descriptionRef = useRef<HTMLTextAreaElement>();
  const lengthRef = useRef<HTMLInputElement>();
  const isHiddenRef = useRef<HTMLInputElement>();
  const eventNameRef = useRef<HTMLInputElement>();

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
    const enteredEventName: string = eventNameRef.current.value;
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
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3 sm:col-span-2">
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
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                          className="flex-1 block w-full focus:ring-blue-500 focus:border-blue-500 min-w-0 rounded-none rounded-r-md sm:text-sm border-gray-300"
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
                            className="flex-1 block w-full focus:ring-blue-500 focus:border-blue-500 min-w-0 rounded-none rounded-r-md sm:text-sm border-gray-300"
                            onChange={(e) => openLocationModal(e.value)}
                          />
                        </div>
                      </div>
                    )}
                    {locations.length > 0 && (
                      <ul className="w-96 mt-1">
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
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="A quick video meeting."
                        defaultValue={eventType.description}></textarea>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="length" className="block text-sm font-medium text-gray-700">
                      Length
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        ref={lengthRef}
                        type="number"
                        name="length"
                        id="length"
                        required
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-20 sm:text-sm border-gray-300 rounded-md"
                        placeholder="15"
                        defaultValue={eventType.length}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 text-sm">
                        minutes
                      </div>
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
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
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
                  <hr className="my-4" />
                  <div>
                    <h3 className="mb-2">How do you want to offer your availability for this event type?</h3>
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
                </form>
              </div>
            </div>
          </div>
          <div>
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
            className="fixed z-10 inset-0 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                aria-hidden="true"></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="sm:flex sm:items-start mb-4">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <LocationMarkerIcon className="h-6 w-6 text-blue-600" />
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
                    className="mb-2 flex-1 block w-full focus:ring-blue-500 focus:border-blue-500 min-w-0 rounded-none rounded-r-md sm:text-sm border-gray-300"
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
            className="fixed z-10 inset-0 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                aria-hidden="true"
              />

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="sm:flex sm:items-start mb-4">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <PlusIcon className="h-6 w-6 text-blue-600" />
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
                      className="mb-2 flex-1 block w-full focus:ring-blue-500 focus:border-blue-500 min-w-0 rounded-none rounded-r-md sm:text-sm border-gray-300 mt-1"
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
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        defaultValue={selectedCustomInput?.label}
                      />
                    </div>
                  </div>
                  <div className="flex items-center h-5">
                    <input
                      id="required"
                      name="required"
                      type="checkbox"
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded mr-2"
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
      imageSrc: "integrations/google-calendar.png",
      description: "For personal and business accounts",
    },
    {
      installed: !!(process.env.MS_GRAPH_CLIENT_ID && process.env.MS_GRAPH_CLIENT_SECRET),
      type: "office365_calendar",
      enabled: credentials.find((integration) => integration.type === "office365_calendar") != null,
      title: "Office 365 / Outlook.com Calendar",
      imageSrc: "integrations/office-365.png",
      description: "For personal and business accounts",
    },
  ];

  const locationOptions: OptionBase[] = [
    { value: LocationType.InPerson, label: "In-person meeting" },
    { value: LocationType.Phone, label: "Phone call" },
    { value: LocationType.Zoom, label: "Zoom Video" },
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

  return {
    props: {
      user,
      eventType,
      locationOptions,
      availability,
    },
  };
};
