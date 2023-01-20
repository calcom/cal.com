import { ErrorMessage } from "@hookform/error-message";
import { zodResolver } from "@hookform/resolvers/zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { components } from "react-select";
import { z } from "zod";

import {
  EventLocationType,
  getEventLocationType,
  getHumanReadableLocationValue,
  getMessageForOrganizer,
  LocationObject,
  LocationType,
} from "@calcom/app-store/locations";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RouterOutputs, trpc } from "@calcom/trpc/react";
import { Button, Dialog, DialogClose, DialogContent, DialogFooter, Form, Icon, PhoneInput } from "@calcom/ui";

import { QueryCell } from "@lib/QueryCell";

import CheckboxField from "@components/ui/form/CheckboxField";
import Select from "@components/ui/form/Select";

type BookingItem = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];

type OptionTypeBase = {
  label: string;
  value: EventLocationType["type"];
  disabled?: boolean;
};

interface ISetLocationDialog {
  saveLocation: (newLocationType: EventLocationType["type"], details: { [key: string]: string }) => void;
  selection?: OptionTypeBase;
  booking?: BookingItem;
  defaultValues?: LocationObject[];
  setShowLocationModal: React.Dispatch<React.SetStateAction<boolean>>;
  isOpenDialog: boolean;
  setSelectedLocation?: (param: OptionTypeBase | undefined) => void;
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
  if (eventLocationType?.organizerInputType === "text") {
    return (
      <input {...locationFormMethods.register(eventLocationType.variable)} type="text" {...remainingProps} />
    );
  } else if (eventLocationType?.organizerInputType === "phone") {
    return (
      <PhoneInput
        name={eventLocationType.variable}
        control={locationFormMethods.control}
        {...remainingProps}
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
              className="block w-full rounded-sm border-gray-300 text-sm"
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
    <Dialog open={isOpenDialog}>
      <DialogContent disableOverflow>
        <div className="flex flex-row space-x-3">
          <div className="bg-secondary-100 mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10">
            <Icon.FiMapPin className="text-primary-600 h-6 w-6" />
          </div>
          <div className="w-full">
            <div className="mt-3 text-center sm:mt-0 sm:text-left">
              <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                {t("edit_location")}
              </h3>
              {!booking && (
                <p className="text-sm text-gray-400">{t("this_input_will_shown_booking_this_event")}</p>
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
                success={({ data: locationOptions }) => {
                  if (!locationOptions.length) return null;
                  if (booking) {
                    locationOptions.forEach((location) => {
                      if (location.label === "phone") {
                        location.options.filter((l) => l.value !== "phone");
                      } else if (location.label === "in person") {
                        location.options.filter((l) => l.value !== "attendeeInPerson");
                      }
                    });
                  }
                  return (
                    <Controller
                      name="locationType"
                      control={locationFormMethods.control}
                      render={() => (
                        <Select<{ label: string; value: string; icon?: string }>
                          maxMenuHeight={300}
                          name="location"
                          defaultValue={selection}
                          options={locationOptions}
                          components={{
                            Option: (props) => (
                              <components.Option {...props}>
                                <div className="flex items-center gap-3">
                                  {props.data.icon && (
                                    <img src={props.data.icon} alt="cover" className="h-3.5 w-3.5" />
                                  )}
                                  <span
                                    className={classNames(
                                      "text-sm font-medium",
                                      props.isSelected ? "text-white" : "text-gray-900"
                                    )}>
                                    {props.data.label}
                                  </span>
                                </div>
                              </components.Option>
                            ),
                          }}
                          formatOptionLabel={(e) => (
                            <div className="flex items-center gap-3">
                              {e.icon && <img src={e.icon} alt="app-icon" className="h-5 w-5" />}
                              <span>{e.label}</span>
                            </div>
                          )}
                          formatGroupLabel={(e) => (
                            <p className="text-xs font-medium text-gray-600">{e.label}</p>
                          )}
                          isSearchable
                          className="my-4 block w-full min-w-0 flex-1 rounded-sm border border-gray-300 text-sm"
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
              <DialogFooter>
                <div className="mt-4 flex justify-end space-x-2 rtl:space-x-reverse">
                  <Button
                    onClick={() => {
                      setShowLocationModal(false);
                      setSelectedLocation?.(undefined);
                      setEditingLocationType?.("");
                      locationFormMethods.unregister("locationType");
                    }}
                    type="button"
                    color="secondary">
                    {t("cancel")}
                  </Button>

                  <Button type="submit">{t("update")}</Button>
                </div>
              </DialogFooter>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
