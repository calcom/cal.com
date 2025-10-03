import { Button } from "@calid/features/ui/components/button";
import { Input } from "@calid/features/ui/components/input/input";
import { ErrorMessage } from "@hookform/error-message";
import { zodResolver } from "@hookform/resolvers/zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch, useFormContext } from "react-hook-form";
import { z } from "zod";

import type { EventLocationType, LocationObject } from "@calcom/app-store/locations";
import {
  getEventLocationType,
  getHumanReadableLocationValue,
  getMessageForOrganizer,
  isAttendeeInputRequired,
  LocationType,
  OrganizerDefaultConferencingAppType,
} from "@calcom/app-store/locations";
import { Dialog, DialogContent, DialogFooter } from "@calid/features/ui/components/dialog";
import PhoneInput from "@calcom/features/components/phone-input";
import type { LocationOption } from "@calcom/features/form/components/LocationSelect";
import LocationSelect from "@calcom/features/form/components/LocationSelect";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Form } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import { QueryCell } from "../../lib/QueryCell";

interface ISetLocationDialog {
  saveLocation: ({
    newLocation,
    credentialId,
  }: {
    newLocation: string;
    credentialId: number | null;
  }) => Promise<void>;
  selection?: LocationOption;
  booking: {
    location: string | null;
  };
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
  const locationsQuery = trpc.viewer.apps.locationOptions.useQuery({ teamId });

  useEffect(() => {
    if (selection) {
      locationFormMethods.setValue("locationType", selection?.value);
      if (selection?.address) {
        locationFormMethods.setValue("locationAddress", selection?.address);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  const getIconFromValue = (value: string) => {
    switch (value) {
      case "phone":
        return <Icon name="phone" className="h-3.5 w-3.5" />;
      case "userPhone":
        return <Icon name="phone" className="h-3.5 w-3.5" />;
      case "inPerson":
        return <Icon name="map-pin" className="h-3.5 w-3.5" />;
      case "attendeeInPerson":
        return <Icon name="map-pin" className="h-3.5 w-3.5" />;
      case "link":
        return <Icon name="link" className="h-3.5 w-3.5" />;
      case "somewhereElse":
        return <Icon name="map" className="h-3.5 w-3.5" />;
      default:
        return <Icon name="video" className="h-3.5 w-3.5" />;
    }
  };

  const locationFormSchema = z.object({
    locationType: z.string(),
    phone: z.string().optional().nullable(),
    locationAddress: z.string().optional(),
    credentialId: z.number().nullable().optional(),
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
    locationPhoneNumber: z
      .string()
      .nullable()
      .refine((val) => {
        if (val === null) return false;
        return isValidPhoneNumber(val);
      })
      .optional(),
  });

  const [isLocationUpdating, setIsLocationUpdating] = useState(false);

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

  /**
   * Depending on the location type that is selected, we show different input types or no input at all.
   */
  const SelectedLocationInput = (() => {
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
        </div>
      );
    } else {
      return <p className="text-default text-sm">{getMessageForOrganizer(selectedLocation, t)}</p>;
    }
  })();

  return (
    <Dialog open={isOpenDialog} onOpenChange={(open) => setShowLocationModal(open)}>
      <DialogContent>
        <Form
          form={locationFormMethods}
          handleSubmit={async (values) => {
            const { locationType: newLocationType } = values;
            let newLocation;
            // For the locations that require organizer to type-in some values, we need the value
            if (eventLocationType?.organizerInputType) {
              newLocation = values[eventLocationType.variable];
            } else {
              // locationType itself can be used here e.g. For zoom we use the type itself which is "integrations:zoom". For Organizer's Default Conferencing App, it is OrganizerDefaultConferencingAppType constant
              newLocation = newLocationType;
            }

            setIsLocationUpdating(true);
            try {
              await saveLocation({
                newLocation,
                credentialId: values.credentialId ?? null,
              });
              setIsLocationUpdating(false);
              setShowLocationModal(false);
              setSelectedLocation?.(undefined);
              locationFormMethods.unregister([
                "locationType",
                "locationLink",
                "locationAddress",
                "locationPhoneNumber",
              ]);
            } catch (error) {
              // Let the user retry
              setIsLocationUpdating(false);
            }
          }}>
          <div className="flex flex-row space-x-3">
            <div className="w-full">
              <div className="mt-3 text-center sm:mt-0 sm:text-left">
                <h3 className="text-emphasis text-lg font-medium leading-6" id="modal-title">
                  {t("edit_location")}
                </h3>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:text-left" />

              <div className="text-muted flex flex-row items-center pt-4">
                <p className="text-emphasis pr-2 text-sm font-bold">{t("current_location")}:</p>
                {getIconFromValue(booking.location)}
                <p className=" text-emphasis break-all pl-1 text-sm">
                  {getHumanReadableLocationValue(booking.location, t)}
                </p>
              </div>
              <QueryCell
                query={locationsQuery}
                success={({ data }) => {
                  if (!data.length) return null;
                  let locationOptions = [...data].map((option) => {
                    if (teamId) {
                      // Let host's Default conferencing App option show for Team Event
                      return option;
                    }
                    return {
                      ...option,
                      options: option.options.filter((o) => o.value !== OrganizerDefaultConferencingAppType),
                    };
                  });

                  locationOptions = locationOptions.map((locationOption) =>
                    filterLocationOptionsForBooking(locationOption)
                  );

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
                                locationFormMethods.setValue("credentialId", val.credentialId);
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
              {selectedLocation && SelectedLocationInput}
            </div>
          </div>
          <DialogFooter className="mt-8">
            <Button
              onClick={() => {
                setShowLocationModal(false);
                setSelectedLocation?.(undefined);
                setEditingLocationType?.("");
                locationFormMethods.unregister(["locationType", "locationLink"]);
              }}
              color="secondary">
              {t("cancel")}
            </Button>
            <Button
              data-testid="update-location"
              type="submit"
              disabled={isLocationUpdating}>
              {t("update")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

function filterLocationOptionsForBooking<T extends { options: { value: string }[] }>(locationOption: T) {
  return {
    ...locationOption,
    options: locationOption.options.filter((o) => !isAttendeeInputRequired(o.value)),
  };
}
