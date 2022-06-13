import { LocationMarkerIcon } from "@heroicons/react/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";
import { Dialog, DialogContent } from "@calcom/ui/Dialog";
import { Form } from "@calcom/ui/form/fields";

import { QueryCell } from "@lib/QueryCell";
import { linkValueToString } from "@lib/linkValueToString";
import { LocationType } from "@lib/location";
import { LocationOptionsToString } from "@lib/locationOptions";
import { inferQueryOutput, trpc } from "@lib/trpc";

import CheckboxField from "@components/ui/form/CheckboxField";
import type PhoneInputType from "@components/ui/form/PhoneInput";
import Select from "@components/ui/form/Select";

const PhoneInput = dynamic(
  () => import("@components/ui/form/PhoneInput")
) as unknown as typeof PhoneInputType;

type BookingItem = inferQueryOutput<"viewer.bookings">["bookings"][number];

type OptionTypeBase = {
  label: string;
  value: LocationType;
  disabled?: boolean;
};

type LocationFormValues = {
  locationType: LocationType;
  locationAddress?: string;
  locationLink?: string;
  locationPhoneNumber?: string;
  displayLocationPublicly?: boolean;
};
interface ISetLocationDialog {
  saveLocation: (newLocationType: LocationType, details: { [key: string]: string }) => void;
  selection?: OptionTypeBase;
  booking?: BookingItem;
  defaultValues?: {
    type: LocationType;
    address?: string | undefined;
    link?: string | undefined;
    hostPhoneNumber?: string | undefined;
    displayLocationPublicly?: boolean | undefined;
  }[];
  setShowLocationModal: React.Dispatch<React.SetStateAction<boolean>>;
  isOpenDialog: boolean;
  setSelectedLocation?: (param: OptionTypeBase | undefined) => void;
}

export const EditLocationDialog = (props: ISetLocationDialog) => {
  const {
    saveLocation,
    selection,
    booking,
    setShowLocationModal,
    isOpenDialog,
    defaultValues,
    setSelectedLocation,
  } = props;
  const { t } = useLocale();
  const locationsQuery = trpc.useQuery(["viewer.locationOptions"]);

  useEffect(() => {
    if (selection) {
      locationFormMethods.setValue("locationType", selection?.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  const locationFormSchema = z.object({
    locationType: z.string(),
    locationAddress: z.string().optional(),
    locationLink: z.string().url().optional(),
    displayLocationPublicly: z.boolean().optional(),
    locationPhoneNumber: z
      .string()
      .refine((val) => isValidPhoneNumber(val))
      .optional(),
  });

  const locationFormMethods = useForm<LocationFormValues>({
    mode: "onSubmit",
    resolver: zodResolver(locationFormSchema),
  });

  const selectedLocation = useWatch({
    control: locationFormMethods.control,
    name: "locationType",
  });

  const LocationOptions =
    selectedLocation === LocationType.InPerson ? (
      <>
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
              className="block w-full rounded-sm border-gray-300 text-sm"
              defaultValue={
                defaultValues
                  ? defaultValues.find(
                      (location: { type: LocationType }) => location.type === LocationType.InPerson
                    )?.address
                  : undefined
              }
            />
          </div>
          {!booking && (
            <div className="mt-3">
              <Controller
                name="displayLocationPublicly"
                control={locationFormMethods.control}
                render={() => (
                  <CheckboxField
                    defaultChecked={
                      defaultValues
                        ? defaultValues.find((location) => location.type === LocationType.InPerson)
                            ?.displayLocationPublicly
                        : undefined
                    }
                    description={t("display_location_label")}
                    onChange={(e) =>
                      locationFormMethods.setValue("displayLocationPublicly", e.target.checked)
                    }
                    informationIconText={t("display_location_info_badge")}></CheckboxField>
                )}
              />
            </div>
          )}
        </div>
      </>
    ) : selectedLocation === LocationType.Link ? (
      <div>
        <label htmlFor="link" className="block text-sm font-medium text-gray-700">
          {t("set_link_meeting")}
        </label>
        <div className="mt-1">
          <input
            type="text"
            {...locationFormMethods.register("locationLink")}
            id="link"
            required
            className="block w-full rounded-sm border-gray-300 sm:text-sm"
            defaultValue={
              defaultValues
                ? defaultValues.find(
                    (location: { type: LocationType }) => location.type === LocationType.Link
                  )?.link
                : undefined
            }
          />
          {locationFormMethods.formState.errors.locationLink && (
            <p className="mt-1 text-sm text-red-500">{t("url_start_with_https")}</p>
          )}
        </div>
        {!booking && (
          <div className="mt-3">
            <Controller
              name="displayLocationPublicly"
              control={locationFormMethods.control}
              render={() => (
                <CheckboxField
                  description={t("display_location_label")}
                  defaultChecked={
                    defaultValues
                      ? defaultValues.find((location) => location.type === LocationType.Link)
                          ?.displayLocationPublicly
                      : undefined
                  }
                  onChange={(e) => locationFormMethods.setValue("displayLocationPublicly", e.target.checked)}
                  informationIconText={t("display_location_info_badge")}></CheckboxField>
              )}
            />
          </div>
        )}
      </div>
    ) : selectedLocation === LocationType.UserPhone ? (
      <div>
        <label htmlFor="phonenumber" className="block text-sm font-medium text-gray-700">
          {t("set_your_phone_number")}
          {locationFormMethods.formState?.errors?.locationPhoneNumber?.message}
        </label>
        <div className="mt-1">
          <PhoneInput<LocationFormValues>
            control={locationFormMethods.control}
            name="locationPhoneNumber"
            required
            id="locationPhoneNumber"
            placeholder={t("host_phone_number")}
            defaultValue={
              defaultValues
                ? defaultValues.find(
                    (location: { type: LocationType }) => location.type === LocationType.UserPhone
                  )?.hostPhoneNumber
                : undefined
            }
          />
          {locationFormMethods.formState.errors.locationPhoneNumber && (
            <p className="mt-1 text-sm text-red-500">Invalid input</p>
          )}
        </div>
      </div>
    ) : (
      <p className="text-sm">{LocationOptionsToString(selectedLocation, t)}</p>
    );

  return (
    <Dialog open={isOpenDialog}>
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
              {!booking && (
                <p className="text-sm text-gray-400">{t("this_input_will_shown_booking_this_event")}</p>
              )}
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left"></div>
          </div>
          {booking && (
            <>
              <p className="mt-6 mb-2 ml-1 text-sm font-bold text-black">{t("current_location")}:</p>
              <p className="mb-2 ml-1 text-sm text-black">{linkValueToString(booking.location, t)}</p>
            </>
          )}
          <Form
            form={locationFormMethods}
            handleSubmit={async (values) => {
              const { locationType: newLocation, displayLocationPublicly } = values;

              let details = {};
              if (newLocation === LocationType.InPerson) {
                details = {
                  address: values.locationAddress,
                  displayLocationPublicly,
                };
              }
              if (newLocation === LocationType.Link) {
                details = { link: values.locationLink, displayLocationPublicly };
              }
              if (newLocation === LocationType.UserPhone) {
                details = { hostPhoneNumber: values.locationPhoneNumber };
              }

              saveLocation(newLocation, details);
              setShowLocationModal(false);
              setSelectedLocation?.(undefined);
              locationFormMethods.unregister([
                "locationType",
                "locationLink",
                "locationAddress",
                "locationPhoneNumber",
              ]);
            }}>
            <QueryCell
              query={locationsQuery}
              success={({ data: locationOptions }) => {
                if (!locationOptions.length) return null;
                return (
                  <Controller
                    name="locationType"
                    control={locationFormMethods.control}
                    render={() => (
                      <Select
                        maxMenuHeight={150}
                        name="location"
                        defaultValue={selection}
                        options={
                          booking
                            ? locationOptions.filter((location) => location.value !== "phone")
                            : locationOptions
                        }
                        isSearchable={false}
                        className="my-4 block w-full min-w-0 flex-1 rounded-sm border border-gray-300 sm:text-sm"
                        onChange={(val) => {
                          if (val) {
                            locationFormMethods.setValue("locationType", val.value);
                            locationFormMethods.unregister([
                              "locationLink",
                              "locationAddress",
                              "locationPhoneNumber",
                            ]);
                            locationFormMethods.clearErrors([
                              "locationLink",
                              "locationPhoneNumber",
                              "locationAddress",
                            ]);
                            setSelectedLocation?.(val);
                          }
                        }}
                      />
                    )}
                  />
                );
              }}
            />
            {selectedLocation && LocationOptions}
            <div className="mt-4 flex justify-end space-x-2">
              <Button
                onClick={() => {
                  setShowLocationModal(false);
                  setSelectedLocation?.(undefined);
                  locationFormMethods.unregister("locationType");
                }}
                type="button"
                color="secondary">
                {t("cancel")}
              </Button>
              <Button type="submit">{t("update")}</Button>
            </div>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
