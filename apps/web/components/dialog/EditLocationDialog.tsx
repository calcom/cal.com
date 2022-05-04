import { LocationMarkerIcon } from "@heroicons/react/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm, UseFormReturn, useWatch } from "react-hook-form";
import { z } from "zod";

import getApps, { getLocationOptions } from "@calcom/app-store/utils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";
import { Dialog, DialogContent } from "@calcom/ui/Dialog";
import { Form } from "@calcom/ui/form/fields";

import { LocationType } from "@lib/location";
import { inferQueryOutput, trpc } from "@lib/trpc";

import Select from "@components/ui/form/Select";

type BookingItem = inferQueryOutput<"viewer.bookings">["bookings"][number];

type OptionTypeBase = {
  label: string;
  value: LocationType;
  disabled?: boolean;
};
interface ISetLocationDialog {
  saveLocation: (newLocationType: LocationType, details: { [key: string]: string }) => void;
  selection?: OptionTypeBase;
  booking?: BookingItem;
  defaultValues?: any;
  setShowLocationModal: React.Dispatch<React.SetStateAction<boolean>>;
  isOpenDialog: boolean;
}

export const EditLocationDialog = (props: ISetLocationDialog) => {
  const { saveLocation, selection, booking, setShowLocationModal, isOpenDialog, defaultValues } = props;
  const { t } = useLocale();
  const { isSuccess, data } = trpc.useQuery(["viewer.credentials"]);
  const [locationOptions, setLocationOptions] = useState<Array<OptionTypeBase>>([]);

  const applyNamingFormat = (location: string | null | undefined): string => {
    if (!location) return "";

    let finalString = location;

    if (location.substring(0, 13) === "integrations:") {
      finalString = location.substring(13);
      finalString = finalString.charAt(0).toUpperCase() + finalString.slice(1);
      finalString = finalString.replace(":", " ");
    }
    return finalString;
  };

  const [currentLocation, setCurrentLocation] = useState(applyNamingFormat(booking?.location) || "");

  useEffect(() => {
    if (data) {
      const integrations = getApps(data);
      setLocationOptions(getLocationOptions(integrations, t));
      if (selection) {
        locationFormMethods.setValue("locationType", selection?.value);
        locationFormMethods.unregister("locationLink");
        locationFormMethods.unregister("locationAddress");
      }
    }
  }, [isSuccess, selection]);

  const newFormMethods = useForm<{
    locations: { type: LocationType; address?: string; link?: string }[];
  }>({
    defaultValues: {
      locations: [],
    },
  });

  const locationFormSchema = z.object({
    locationType: z.string(),
    locationAddress: z.string().optional(),
    locationLink: z.string().url().optional(), // URL validates as new URL() - which requires HTTPS:// In the input field
  });

  const locationFormMethods = useForm<{
    locationType: LocationType;
    locationAddress?: string; // TODO: We should validate address or fetch the address from googles api to see if its valid?
    locationLink?: string; // Currently this only accepts links that are HTTPS://
  }>({
    resolver: zodResolver(locationFormSchema),
  });

  const selectedLocation = useWatch({
    control: locationFormMethods.control,
    name: "locationType",
    defaultValue: selection ? selection.value : undefined,
  });

  const LocationOptions = () => {
    if (!selectedLocation) {
      return null;
    }
    switch (selectedLocation) {
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
                className="border-grays-300 block w-full rounded-sm text-sm shadow-sm "
                defaultValue={
                  defaultValues
                    ? defaultValues.find(
                        (location: { type: LocationType }) => location.type === LocationType.InPerson
                      )?.address
                    : newFormMethods
                        .getValues("locations")
                        .find((location: { type: LocationType }) => location.type === LocationType.InPerson)
                        ?.address
                }
              />
            </div>
          </div>
        );
      case LocationType.Link:
        return (
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              {t("set_link_meeting")}
            </label>
            <div className="mt-1">
              <input
                type="text"
                {...locationFormMethods.register("locationLink")}
                id="address"
                required
                className="block w-full rounded-sm border-gray-300 shadow-sm sm:text-sm"
                defaultValue={
                  defaultValues
                    ? defaultValues.find(
                        (location: { type: LocationType }) => location.type === LocationType.Link
                      )?.link
                    : newFormMethods
                        .getValues("locations")
                        .find((location: { type: LocationType }) => location.type === LocationType.Link)?.link
                }
              />
              {locationFormMethods.formState.errors.locationLink && (
                <p className="mt-1 text-red-500">
                  {locationFormMethods.formState.errors.locationLink.message}
                </p>
              )}
            </div>
          </div>
        );
      case LocationType.Phone:
        return <p className="text-sm">{t("cal_invitee_phone_number_scheduling")}</p>;
      /* TODO: Render this dynamically from App Store */
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
      case LocationType.Teams:
        return <p className="text-sm">{t("cal_provide_teams_meeting_url")}</p>;
      default:
        return null;
    }
  };

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
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left"></div>
          </div>
          {booking && (
            <>
              <p className="mt-6 mb-2 ml-1 text-sm font-bold text-black">{t("current_location")}:</p>
              <p className="mb-2 ml-1 text-sm text-black">
                {currentLocation ? currentLocation : t("no_location")}
              </p>
            </>
          )}
          <Form
            form={locationFormMethods}
            handleSubmit={async (values) => {
              const newLocation = values.locationType;

              let details = {};
              let locationString = values.locationType as string;
              if (newLocation === LocationType.InPerson) {
                details = { address: values.locationAddress };
                locationString = values.locationAddress || "";
              }
              if (newLocation === LocationType.Link) {
                details = { link: values.locationLink };
                locationString = values.locationLink || "";
              }

              saveLocation(newLocation, details);
              if (booking) {
                setCurrentLocation(applyNamingFormat(locationString));
              }
              setShowLocationModal(false);
            }}>
            <Controller
              name="locationType"
              control={locationFormMethods.control}
              render={() => (
                <Select
                  maxMenuHeight={150}
                  name="location"
                  defaultValue={selection}
                  options={locationOptions}
                  isSearchable={false}
                  className="my-4 block w-full min-w-0 flex-1 rounded-sm border border-gray-300 sm:text-sm"
                  onChange={(val) => {
                    if (val) {
                      locationFormMethods.setValue("locationType", val.value);
                      locationFormMethods.unregister("locationLink");
                      locationFormMethods.unregister("locationAddress");
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
  );
};
