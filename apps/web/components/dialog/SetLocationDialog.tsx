import { LocationMarkerIcon, GlobeAltIcon, PhoneIcon, PencilIcon, PlusIcon } from "@heroicons/react/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState, Dispatch, SetStateAction, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useMutation } from "react-query";
import { z } from "zod";

import getApps, { getLocationOptions, hasIntegration } from "@calcom/app-store/utils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getTranslation } from "@calcom/lib/server/i18n";
import Button from "@calcom/ui/Button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/Dialog";
import { Form, TextArea } from "@calcom/ui/form/fields";

import { LocationType } from "@lib/location";
import prisma from "@lib/prisma";
import { inferQueryOutput, trpc } from "@lib/trpc";

import Select, { SelectProps } from "@components/ui/form/Select";

type BookingItem = inferQueryOutput<"viewer.bookings">["bookings"][number];

interface ISetLocationDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  booking: BookingItem;
  userLocale?: string;
  userId?: number;
}

type OptionTypeBase = {
  label: string;
  value: LocationType;
  disabled?: boolean;
};

type AddInfo = { adress?: string; link?: string };

export const SetLocationDialog = (props: ISetLocationDialog) => {
  const { t } = useLocale();
  const { isOpenDialog, setIsOpenDialog, booking: booking } = props;
  const [currentLocation, setCurrentLocation] = useState(booking.location || "");
  const [location, setLocation] = useState(booking.location || "");
  const [address, setAddress] = useState("");
  const [link, setLink] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<OptionTypeBase | undefined>(undefined);
  const query = trpc.useQuery(["viewer.integrations"]);
  const { isSuccess, data } = trpc.useQuery(["viewer.credentials"]);

  const [locationOptions, setLocationOptions] = useState<Array<any>>([]);

  useEffect(() => {
    const fetchData = async () => {
      const translation = await getTranslation(props.userLocale ?? "en", "common");
      if (data) {
        const integrations = getApps(data);
        setLocationOptions(getLocationOptions(integrations, translation));
      }
    };
    fetchData();
  }, [isSuccess]);

  const newMutation = useMutation(async (newLocation: string) => {
    await fetch("/api/book/changeLocation", {
      method: "POST",
      body: JSON.stringify({
        id: booking.id,
        newLocation,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  });

  const locationFormSchema = z.object({
    locationType: z.string(),
    locationAddress: z.string().optional(),
    locationLink: z.string().url().optional(),
  });

  const locationFormMethods = useForm<{
    locationType: LocationType;
    locationAddress?: string;
    locationLink?: string;
  }>({
    resolver: zodResolver(locationFormSchema),
  });

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent>
        <div className="flex flex-row space-x-3">
          <div className="flex h-10 w-10 flex-shrink-0 justify-center rounded-full bg-[#FAFAFA]">
            <LocationMarkerIcon className="m-auto h-6 w-6"></LocationMarkerIcon>
          </div>
          <div className="w-full pt-1 pr-2">
            <DialogHeader title={t("set_location")} />
            <p className="mt-6 mb-2 text-sm font-bold text-black">{t("current_location")}:</p>
            <p className="mb-2 text-sm text-black">{currentLocation ? currentLocation : t("no_location")}</p>
            <p className="mt-6 mb-2 text-sm font-bold text-black">{t("new_location")}:</p>

            <div className="w-full">
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
                    className="my-4 block w-full min-w-0 flex-1 rounded-sm border border-gray-300 sm:text-sm"
                    onChange={(val) => {
                      if (val) {
                        locationFormMethods.setValue("locationType", val.value);
                        locationFormMethods.unregister("locationLink");
                        locationFormMethods.unregister("locationAddress");
                        setSelectedLocation(val);
                      }
                    }}
                  />
                )}
              />
              {selectedLocation && (
                <>
                  {selectedLocation.value === LocationType.InPerson && (
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                        {t("set_address_place")}
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          required
                          className="block w-full rounded-sm border-gray-300 text-sm shadow-sm "
                        />
                      </div>
                    </div>
                  )}
                  {selectedLocation.value === LocationType.Link && (
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                        {t("set_link_meeting")}
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="link"
                          value={link}
                          onChange={(e) => setLink(e.target.value)}
                          required
                          className="block w-full rounded-sm border-gray-300 shadow-sm sm:text-sm"
                        />
                        {locationFormMethods.formState.errors.locationLink && (
                          <p className="mt-1 text-red-500">
                            {locationFormMethods.formState.errors.locationLink.message}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedLocation.value === LocationType.Phone && (
                    <p className="text-sm">{t("cal_invitee_phone_number_scheduling")}</p>
                  )}
                  {selectedLocation.value === LocationType.GoogleMeet && (
                    <p className="text-sm">{t("cal_provide_google_meet_location")}</p>
                  )}
                  {selectedLocation.value === LocationType.Zoom && (
                    <p className="text-sm">{t("cal_provide_zoom_meeting_url")}</p>
                  )}
                  {selectedLocation.value === LocationType.Daily && (
                    <p className="text-sm">{t("cal_provide_video_meeting_url")}</p>
                  )}
                  {selectedLocation.value === LocationType.Jitsi && (
                    <p className="text-sm">{t("cal_provide_jitsi_meeting_url")}</p>
                  )}
                  {selectedLocation.value === LocationType.Huddle01 && (
                    <p className="text-sm">{t("cal_provide_huddle01_meeting_url")}</p>
                  )}
                  {selectedLocation.value === LocationType.Tandem && (
                    <p className="text-sm">{t("cal_provide_tandem_meeting_url")}</p>
                  )}
                  {selectedLocation.value === LocationType.Teams && (
                    <p className="text-sm">{t("cal_provide_teams_meeting_url")}</p>
                  )}
                </>
              )}
            </div>

            <DialogFooter>
              <DialogClose>
                <Button color="secondary">{t("cancel")}</Button>
              </DialogClose>
              <Button
                onClick={() => {
                  let newLocation;
                  if (selectedLocation?.value === LocationType.InPerson) {
                    newLocation = address;
                  } else if (selectedLocation?.value === LocationType.Link) {
                    newLocation = link;
                  } else {
                    newLocation = selectedLocation?.value || "";
                  }
                  setLocation(newLocation);
                  setCurrentLocation(newLocation);
                  setIsOpenDialog(false);
                  newMutation.mutate(newLocation);
                }}>
                Change location
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
