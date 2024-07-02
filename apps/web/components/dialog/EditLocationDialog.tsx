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
  OrganizerDefaultConferencingAppType,
} from "@calcom/app-store/locations";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button, Icon, Input, Dialog, DialogContent, DialogFooter, Form, PhoneInput } from "@calcom/ui";

import { QueryCell } from "@lib/QueryCell";

import CheckboxField from "@components/ui/form/CheckboxField";
import type { LocationOption } from "@components/ui/form/LocationSelect";
import LocationSelect from "@components/ui/form/LocationSelect";

type BookingItem = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];

interface ISetLocationDialog {
  saveLocation: (newLocationType: EventLocationType["type"], details: { [key: string]: string }) => void;
  selection?: LocationOption;
  booking?: BookingItem;
  defaultValues?: LocationObject[];
  setShowLocationModal: React.Dispatch<React.SetStateAction<boolean>>;
  isOpenDialog: boolean;
  setSelectedLocation?: (param: LocationOption | undefined) => void;
  setEditingLocationType?: (param: string) => void;
  teamId?: number;
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
    const { defaultValue, ...rest } = remainingProps;

    return (
      <Controller
        name={eventLocationType.variable}
        control={control}
        defaultValue={defaultValue}
        render={({ field: { onChange, value } }) => {
          return <PhoneInput onChange={onChange} value={value} {...rest} />;
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
    setShowLocationModal,
    isOpenDialog,
    defaultValues,
    setSelectedLocation,
    setEditingLocationType,
    teamId,
  } = props;
  const { t } = useLocale();
  const locationsQuery = trpc.viewer.locationOptions.useQuery({ teamId });

  useEffect(() => {
    if (selection) {
      locationFormMethods.setValue("locationType", selection?.value);
      if (selection?.address) {
        locationFormMethods.setValue("locationAddress", selection?.address);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  const locationFormSchema = z.object({
    locationType: z.string(),
    phone: z.string().optional().nullable(),
    locationAddress: z.string().optional(),
    credentialId: z.number().optional(),
    teamName: z.string().optional(),
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
                sampleUrl ? `Sample URL: ${sampleUrl}` : ""
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

  const selectedAddrValue = useWatch({
    control: locationFormMethods.control,
    name: "locationAddress",
  });

  const eventLocationType = getEventLocationType(selectedLocation);

  const defaultLocation = defaultValues?.find(
    (location: { type: EventLocationType["type"]; address?: string }) => {
      if (location.type === LocationType.InPerson) {
        return location.type === eventLocationType?.type && location.address === selectedAddrValue;
      } else {
        return location.type === eventLocationType?.type;
      }
    }
  );

  const LocationOptions = (() => {
    if (eventLocationType && eventLocationType.organizerInputType && LocationInput) {
      if (!eventLocationType.variable) {
        console.error("eventLocationType.variable can't be undefined");
        return null;
      }

      return (
        <div>
          <label htmlFor="locationInput" className="text-default block text-sm font-medium">
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
              className="text-error mt-1 text-sm"
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
      return <p className="text-default text-sm">{getMessageForOrganizer(selectedLocation, t)}</p>;
    }
  })();

  return (
    <Dialog open={isOpenDialog} onOpenChange={(open) => setShowLocationModal(open)}>
      <DialogContent>
        <div className="flex flex-row space-x-3">
          <div className="bg-subtle mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10">
            <Icon name="map-pin" className="text-emphasis h-6 w-6" />
          </div>
          <div className="w-full">
            <div className="mt-3 text-center sm:mt-0 sm:text-left">
              <h3 className="text-emphasis text-lg font-medium leading-6" id="modal-title">
                {t("edit_location")}
              </h3>
              {!booking && (
                <p className="text-default text-sm">
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
                <p className="text-emphasis mb-2 ml-1 mt-6 text-sm font-bold">{t("current_location")}:</p>
                <p className="text-emphasis mb-2 ml-1 text-sm">
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

                if (values.credentialId) {
                  details = {
                    ...details,
                    credentialId: values.credentialId,
                  };
                }

                if (values.teamName) {
                  details = {
                    ...details,
                    teamName: values.teamName,
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
                  const locationOptions = [...data].map((option) => {
                    if (teamId) {
                      // Let host's Default conferencing App option show for Team Event
                      return option;
                    }
                    return {
                      ...option,
                      options: option.options.filter((o) => o.value !== OrganizerDefaultConferencingAppType),
                    };
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
                                if (!!val.credentialId) {
                                  locationFormMethods.setValue("credentialId", val.credentialId);
                                  locationFormMethods.setValue("teamName", val.teamName);
                                }

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
              <DialogFooter className="relative">
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
              </DialogFooter>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
