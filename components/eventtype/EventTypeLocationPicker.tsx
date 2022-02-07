import { PhoneIcon, XIcon } from "@heroicons/react/outline";
import { LocationMarkerIcon, PencilIcon, PlusIcon } from "@heroicons/react/solid";
import React, { useState } from "react";
import { Controller, useForm, useFormContext } from "react-hook-form";
import Select from "react-select";

import { FormData } from "@lib/event-types";
import { useLocale } from "@lib/hooks/useLocale";
import { LocationType } from "@lib/location";

import { Dialog, DialogContent } from "@components/Dialog";
import {
  DailyIcon,
  GoogleMeetLogo,
  Huddle01Logo,
  TandemLogo,
  ZoomLogo,
} from "@components/eventtype/EventTypeLocationIcons";
import { Form } from "@components/form/fields";
import Button from "@components/ui/Button";

export interface LocationTypeOption {
  label: string;
  value: LocationType;
  disabled?: boolean;
}

export function addDefaultLocationOptions(
  defaultLocations: LocationTypeOption[],
  locationOptions: LocationTypeOption[]
): void {
  const existingLocationOptions = locationOptions.flatMap((locationOptionItem) => [locationOptionItem.value]);

  defaultLocations.map((item) => {
    if (!existingLocationOptions.includes(item.value)) {
      locationOptions.push(item);
    }
  });
}

type Locations = { type: LocationType; address?: string }[];

interface LocationFormData {
  locationType: LocationType;
  locationAddress: string;
}

export default function EventTypeLocationPicker(props: { locationOptions: LocationTypeOption[] }) {
  const { t } = useLocale();
  const [selectedLocation, setSelectedLocation] = useState<LocationTypeOption | undefined>(undefined);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const locationForm = useForm<LocationFormData>();
  const parentForm = useFormContext<FormData>();

  const openLocationModal = (type: LocationType) => {
    setSelectedLocation(props.locationOptions.find((option) => option.value === type));
    // only show modal if it requires address field
    if (type === LocationType.InPerson) setShowLocationModal(true);
  };

  const removeLocation = (targetLocation: Locations[number]) => {
    parentForm.setValue(
      "locations",
      parentForm.getValues("locations").filter((location) => location.type !== targetLocation.type),
      { shouldValidate: true }
    );
  };

  const handleSubmit = (values: LocationFormData) => {
    const newLocation = values.locationType;

    let details = {};
    if (newLocation === LocationType.InPerson) {
      details = { address: values.locationAddress };
    }

    const existingIdx = parentForm
      .getValues("locations")
      .findIndex((loc) => values.locationType === loc.type);
    if (existingIdx !== -1) {
      const copy = parentForm.getValues("locations");
      copy[existingIdx] = { ...parentForm.getValues("locations")[existingIdx], ...details };
      parentForm.setValue("locations", copy);
    } else {
      parentForm.setValue(
        "locations",
        parentForm.getValues("locations").concat({ type: values.locationType, ...details })
      );
    }
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
                {...locationForm.register("locationAddress")}
                id="address"
                required
                className="block w-full border-gray-300 rounded-sm shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                defaultValue={
                  parentForm
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
      case LocationType.Huddle01:
        return <p className="text-sm">{t("cal_provide_huddle01_meeting_url")}</p>;
      case LocationType.Tandem:
        return <p className="text-sm">{t("cal_provide_tandem_meeting_url")}</p>;
      default:
        return null;
    }
  };
  return (
    <div className="w-full">
      {parentForm.getValues("locations").length === 0 && (
        <div className="flex">
          {JSON.stringify(parentForm.getValues("locations"))}
          <Select
            options={props.locationOptions}
            isSearchable={false}
            classNamePrefix="react-select"
            className="flex-1 block w-full min-w-0 border border-gray-300 rounded-sm react-select-container focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            onChange={(e) => {
              if (e?.value) {
                openLocationModal(e.value);
                if (e.value !== LocationType.InPerson) {
                  parentForm.setValue("locations", [{ type: e.value }], { shouldValidate: true });
                }
              }
            }}
          />
        </div>
      )}
      {parentForm.getValues("locations").length > 0 && (
        <ul>
          {parentForm.getValues("locations").map((location) => (
            <li
              key={location.type}
              className="py-1.5 px-2 mb-2 border rounded-sm shadow-sm border-neutral-300">
              <div className="flex justify-between">
                {(() => {
                  const obj = {
                    [LocationType.InPerson]: { icon: LocationMarkerIcon, text: location.address },
                    [LocationType.Phone]: { icon: PhoneIcon, text: t("phone_call") },
                    [LocationType.GoogleMeet]: { icon: GoogleMeetLogo, text: "Google Meet" },
                    [LocationType.Huddle01]: { icon: Huddle01Logo, text: "Huddle01 Web3 Video" },
                    [LocationType.Daily]: { icon: DailyIcon, text: "Daily.co Video" },
                    [LocationType.Zoom]: { icon: ZoomLogo, text: "Zoom Video" },
                    [LocationType.Tandem]: { icon: TandemLogo, text: "Tandem Video" },
                  };
                  const Icon = obj[location.type].icon;
                  return (
                    <div className="flex items-center flex-grow">
                      <Icon className="w-5 h-5" />
                      <span className="text-sm ltr:ml-2 rtl:mr-2">{obj[location.type].text}</span>
                    </div>
                  );
                })()}
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => openLocationModal(location.type)}
                    className="p-1 mr-1 text-gray-500 hover:text-gray-900">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => removeLocation(location)}>
                    <XIcon className="w-6 h-6 pl-1 text-gray-500 border-l-1 hover:text-gray-900 " />
                  </button>
                </div>
              </div>
            </li>
          ))}
          {parentForm.getValues("locations").length > 0 &&
            parentForm.getValues("locations").length !== props.locationOptions.length && (
              <li>
                <button
                  type="button"
                  className="flex px-3 py-2 rounded-sm hover:bg-gray-100"
                  onClick={() => setShowLocationModal(true)}>
                  <PlusIcon className="h-4 w-4 mt-0.5 text-neutral-900" />
                  <span className="ml-1 text-sm font-medium text-neutral-700">{t("add_location")}</span>
                </button>
              </li>
            )}
        </ul>
      )}
      <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
        <DialogContent asChild>
          <div className="inline-block px-4 pt-5 pb-4 text-left align-bottom transition-all transform bg-white rounded-sm shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
            <div className="mb-4 sm:flex sm:items-start">
              <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto rounded-full bg-secondary-100 sm:mx-0 sm:h-10 sm:w-10">
                <LocationMarkerIcon className="w-6 h-6 text-primary-600" />
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
              form={locationForm}
              handleSubmit={async (values) => {
                console.log({ values });
                await handleSubmit(values);
                setShowLocationModal(false);
              }}>
              <Controller
                name="locationType"
                control={locationForm.control}
                render={() => (
                  <Select
                    maxMenuHeight={100}
                    name="location"
                    defaultValue={selectedLocation}
                    options={props.locationOptions}
                    isSearchable={false}
                    classNamePrefix="react-select"
                    className="flex-1 block w-full min-w-0 my-4 border border-gray-300 rounded-sm react-select-container focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    onChange={(val) => {
                      if (val) {
                        setSelectedLocation(
                          props.locationOptions.find((option) => option.value === val.value)
                        );
                      }
                    }}
                  />
                )}
              />
              <LocationOptions />
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse ">
                <Button type="submit">{t("update")}</Button>
                <Button
                  onClick={() => setShowLocationModal(false)}
                  type="button"
                  color="secondary"
                  className="ltr:mr-2">
                  {t("cancel")}
                </Button>
              </div>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
