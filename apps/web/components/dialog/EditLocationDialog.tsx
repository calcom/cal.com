import { ErrorMessage } from "@hookform/error-message";
import { zodResolver } from "@hookform/resolvers/zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Trans } from "next-i18next";
import Link from "next/link";
import { useEffect } from "react";
import { Controller, useForm, useWatch, useFormContext } from "react-hook-form";
import { z } from "zod";

import type { EventLocationType, LocationObject } from "@calcom/app-store/locations";
import {
  getEventLocationType,
  getHumanReadableLocationValue,
  getMessageForOrganizer,
  LocationType,
} from "@calcom/app-store/locations";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Input } from "@calcom/ui";
import { Button, Dialog, DialogContent, DialogFooter, Form, PhoneInput } from "@calcom/ui";
import { FiMapPin } from "@calcom/ui/components/icon";

import { QueryCell } from "@lib/QueryCell";

import CheckboxField from "@components/ui/form/CheckboxField";
import type { LocationOption } from "@components/ui/form/LocationSelect";
import LocationSelect from "@components/ui/form/LocationSelect";

type BookingItem = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];

interface ISetLocationDialog {
  saveLocation: (newLocationType: EventLocationType["type"], details: { [key: string]: string }) => void;
  selection?: LocationOption;
  booking?: BookingItem;
  isTeamEvent?: boolean;
  defaultValues?: LocationObject[];
  setShowLocationModal: React.Dispatch<React.SetStateAction<boolean>>;
  isOpenDialog: boolean;
  setSelectedLocation?: (param: LocationOption | undefined) => void;
  setEditingLocationType?: (param: string) => void;
}

const LocationInput = (props: {
  eventLocationType: EventLocationType;
  locationFormMethods: ReturnType<typeof useForm>;
  id: string;
  required: boolean;
  placeholder: string;
  className?: string;
  defaultValue?: string;
}): JSX.Element | null => {
  const { eventLocationType, locationFormMethods, ...remainingProps } = props;
  const { control } = useFormContext() as typeof locationFormMethods;
  if (eventLocationType?.organizerInputType === "text") {
    return (
      <Input {...locationFormMethods.register(eventLocationType.variable)} type="text" {...remainingProps} />
    );
  } else if (eventLocationType?.organizerInputType === "phone") {
    return (
      <Controller
        name={eventLocationType.variable}
        control={control}
        render={({ field: { onChange, value } }) => {
          return <PhoneInput onChange={onChange} value={value} {...remainingProps} />;
        }}
      />
    );
  }
  return null;
};

export const EditLocationDialog = (props: ISetLocationDialog) => {
  const {
    saveLocation,
    selection,
    booking,
    isTeamEvent,
    setShowLocationModal,
    isOpenDialog,
    defaultValues,
    setSelectedLocation,
    setEditingLocationType,
  } = props;
  const { t } = useLocale();
  const locationsQuery = trpc.viewer.locationOptions.useQuery();

  useEffect(() => {
    if (selection) {
      locationFormMethods.setValue("locationType", selection?.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  const locationFormSchema = z.object({
    locationType: z.string(),
    phone: z.string().optional().nullable(),
    locationAddress: z.string().optional(),
    locationLink: z
      .string()
      .optional()
      .superRefine((val, ctx) => {
        if (
          eventLocationType &&
          !eventLocationType.default &&
          eventLocationType.linkType === "static" &&
          eventLocationType.urlRegExp
        ) {
          const valid = z.string().regex(new RegExp(eventLocationType.urlRegExp)).safeParse(val).success;
          if (!valid) {
            const sampleUrl = eventLocationType.organizerInputPlaceholder;
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Invalid URL for ${eventLocationType.label}. ${
                sampleUrl ? "Sample URL: " + sampleUrl : ""
              }`,
            });
          }
          return;
        }

        const valid = z.string().url().optional().safeParse(val).success;
        if (!valid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid URL`,
          });
        }
        return;
      }),
    displayLocationPublicly: z.boolean().optional(),
    locationPhoneNumber: z
      .string()
      .nullable()
      .refine((val) => {
        if (val === null) return false;
        return isValidPhoneNumber(val);
      })
      .optional(),
  });

  const locationFormMethods = useForm({
    mode: "onSubmit",
    resolver: zodResolver(locationFormSchema),
  });

  const selectedLocation = useWatch({
    control: locationFormMethods.control,
    name: "locationType",
  });

  const eventLocationType = getEventLocationType(selectedLocation);

  const defaultLocation = defaultValues?.find(
    (location: { type: EventLocationType["type"] }) => location.type === eventLocationType?.type
  );

  const LocationOptions = (() => {
    if (eventLocationType && eventLocationType.organizerInputType && LocationInput) {
      if (!eventLocationType.variable) {
        console.error("eventLocationType.variable can't be undefined");
        return null;
      }

      return (
        <div>
          <label htmlFor="locationInput" className="block text-sm font-medium text-gray-700">
            {t(eventLocationType.messageForOrganizer || "")}
          </label>
          <div className="mt-1">
            <LocationInput
              locationFormMethods={locationFormMethods}
              eventLocationType={eventLocationType}
              id="locationInput"
              placeholder={t(eventLocationType.organizerInputPlaceholder || "")}
              required
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              defaultValue={
                defaultLocation ? defaultLocation[eventLocationType.defaultValueVariable] : undefined
              }
            />
            <ErrorMessage
              errors={locationFormMethods.formState.errors}
              name={eventLocationType.variable}
              className="mt-1 text-sm text-red-500"
              as="p"
            />
          </div>
          {!booking && (
            <div className="mt-3">
              <Controller
                name="displayLocationPublicly"
                control={locationFormMethods.control}
                render={() => (
                  <CheckboxField
                    data-testid="display-location"
                    defaultChecked={defaultLocation?.displayLocationPublicly}
                    description={t("display_location_label")}
                    onChange={(e) =>
                      locationFormMethods.setValue("displayLocationPublicly", e.target.checked)
                    }
                    informationIconText={t("display_location_info_badge")}
                  />
                )}
              />
            </div>
          )}
        </div>
      );
    } else {
      return <p className="text-sm">{getMessageForOrganizer(selectedLocation, t)}</p>;
    }
  })();

  return (
    <Dialog open={isOpenDialog} onOpenChange={(open) => setShowLocationModal(open)}>
      <DialogContent>
        <div className="flex flex-row space-x-3">
          <div className="bg-secondary-100 mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10">
            <FiMapPin className="text-primary-600 h-6 w-6" />
          </div>
          <div className="w-full">
            <div className="mt-3 text-center sm:mt-0 sm:text-left">
              <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                {t("edit_location")}
              </h3>
              {!booking && (
                <p className="text-sm text-gray-400">
                  <Trans i18nKey="cant_find_the_right_video_app_visit_our_app_store">
                    Can&apos;t find the right video app? Visit our
                    <Link className="cursor-pointer text-blue-500 underline" href="/apps/categories/video">
                      App Store
                    </Link>
                    .
                  </Trans>
                </p>
              )}
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:text-left" />

            {booking && (
              <>
                <p className="mt-6 mb-2 ml-1 text-sm font-bold text-black">{t("current_location")}:</p>
                <p className="mb-2 ml-1 text-sm text-black">
                  {getHumanReadableLocationValue(booking.location, t)}
                </p>
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
                  };
                }
                const eventLocationType = getEventLocationType(newLocation);

                // TODO: There can be a property that tells if it is to be saved in `link`
                if (
                  newLocation === LocationType.Link ||
                  (!eventLocationType?.default && eventLocationType?.linkType === "static")
                ) {
                  details = { link: values.locationLink };
                }

                if (newLocation === LocationType.UserPhone) {
                  details = { hostPhoneNumber: values.locationPhoneNumber };
                }

                if (eventLocationType?.organizerInputType) {
                  details = {
                    ...details,
                    displayLocationPublicly,
                  };
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
                success={({ data }) => {
                  if (!data.length) return null;
                  const locationOptions = [...data].filter((option) => {
                    return !isTeamEvent ? option.label !== "Conferencing" : true;
                  });
                  if (booking) {
                    locationOptions.map((location) =>
                      location.options.filter((l) => !["phone", "attendeeInPerson"].includes(l.value))
                    );
                  }
                  return (
                    <Controller
                      name="locationType"
                      control={locationFormMethods.control}
                      render={() => (
                        <div className="py-4">
                          <LocationSelect
                            maxMenuHeight={300}
                            name="location"
                            defaultValue={selection}
                            options={locationOptions}
                            isSearchable
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
                        </div>
                      )}
                    />
                  );
                }}
              />
              {selectedLocation && LocationOptions}
              <DialogFooter>
                <div className="mt-4 flex justify-end space-x-2 rtl:space-x-reverse">
                  <Button
                    onClick={() => {
                      setShowLocationModal(false);
                      setSelectedLocation?.(undefined);
                      setEditingLocationType?.("");
                      locationFormMethods.unregister(["locationType", "locationLink"]);
                    }}
                    type="button"
                    color="secondary">
                    {t("cancel")}
                  </Button>

                  <Button data-testid="update-location" type="submit">
                    {t("update")}
                  </Button>
                </div>
              </DialogFooter>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
