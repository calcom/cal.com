import { zodResolver } from "@hookform/resolvers/zod";
import type { Dispatch, SetStateAction } from "react";
import type { FC } from "react";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { LocationObject } from "@calcom/app-store/locations";
import { locationsResolver } from "@calcom/app-store/locations";
import NoSSR from "@calcom/lib/components/NoSSR";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AppCategories } from "@calcom/prisma/enums";
import type { EventTypeMetaDataSchema, eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Form } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import EventTypeAppSettingsWrapper from "@components/apps/installation/EventTypeAppSettingsWrapper";
import EventTypeConferencingAppSettings from "@components/apps/installation/EventTypeConferencingAppSettings";

import type { TEventType, TEventTypesForm, TEventTypeGroup } from "~/apps/installation/[[...step]]/step-view";

export type TFormType = {
  id: number;
  metadata: z.infer<typeof EventTypeMetaDataSchema>;
  locations: LocationObject[];
  bookingFields: z.infer<typeof eventTypeBookingFields>;
  seatsPerTimeSlot: number | null;
};

export type ConfigureStepCardProps = {
  slug: string;
  userName: string;
  categories: AppCategories[];
  credentialId?: number;
  loading?: boolean;
  isConferencing: boolean;
  formPortalRef: React.RefObject<HTMLDivElement>;
  eventTypeGroups: TEventTypeGroup[];
  setConfigureStep: Dispatch<SetStateAction<boolean>>;
  handleSetUpLater: () => void;
};

type EventTypeAppSettingsFormProps = Pick<
  ConfigureStepCardProps,
  "slug" | "userName" | "categories" | "credentialId" | "loading" | "isConferencing"
> & {
  eventType: TEventType;
  handleDelete: () => void;
  onSubmit: ({
    locations,
    bookingFields,
    metadata,
  }: {
    metadata?: z.infer<typeof EventTypeMetaDataSchema>;
    bookingFields?: z.infer<typeof eventTypeBookingFields>;
    locations?: LocationObject[];
  }) => void;
};
type TUpdatedEventTypesStatus = { id: number; updated: boolean }[][];

const EventTypeAppSettingsForm = forwardRef<HTMLButtonElement, EventTypeAppSettingsFormProps>(
  function EventTypeAppSettingsForm(props, ref) {
    const { handleDelete, onSubmit, eventType, loading, isConferencing } = props;
    const { t } = useLocale();

    const formMethods = useForm<TFormType>({
      defaultValues: {
        id: eventType.id,
        metadata: eventType?.metadata ?? undefined,
        locations: eventType?.locations ?? undefined,
        bookingFields: eventType?.bookingFields ?? undefined,
        seatsPerTimeSlot: eventType?.seatsPerTimeSlot ?? undefined,
      },
      resolver: zodResolver(
        z.object({
          locations: locationsResolver(t),
        })
      ),
    });

    return (
      <Form
        form={formMethods}
        id={`eventtype-${eventType.id}`}
        handleSubmit={() => {
          const metadata = formMethods.getValues("metadata");
          const locations = formMethods.getValues("locations");
          const bookingFields = formMethods.getValues("bookingFields");
          onSubmit({ metadata, locations, bookingFields });
        }}>
        <div>
          <div className="sm:border-subtle bg-default relative border p-4 dark:bg-black sm:rounded-md">
            <div>
              <span className="text-default font-semibold ltr:mr-1 rtl:ml-1">{eventType.title}</span>{" "}
              <small className="text-subtle hidden font-normal sm:inline">
                /{eventType.team ? eventType.team.slug : props.userName}/{eventType.slug}
              </small>
            </div>
            {isConferencing ? (
              <EventTypeConferencingAppSettings {...props} />
            ) : (
              <EventTypeAppSettingsWrapper {...props} />
            )}
            <Icon
              name="x"
              data-testid={`remove-event-type-${eventType.id}`}
              className="absolute right-4 top-4 h-4 w-4 cursor-pointer"
              onClick={() => !loading && handleDelete()}
            />
            <button type="submit" className="hidden" form={`eventtype-${eventType.id}`} ref={ref}>
              Save
            </button>
          </div>
        </div>
      </Form>
    );
  }
);

const EventTypeGroup = ({
  groupIndex,
  eventTypeGroups,
  setUpdatedEventTypesStatus,
  submitRefs,
  ...props
}: ConfigureStepCardProps & {
  groupIndex: number;
  setUpdatedEventTypesStatus: Dispatch<SetStateAction<TUpdatedEventTypesStatus>>;
  submitRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
}) => {
  const { control } = useFormContext<TEventTypesForm>();
  const { fields, update } = useFieldArray({
    control,
    name: `eventTypeGroups.${groupIndex}.eventTypes`,
    keyName: "fieldId",
  });
  return (
    <div className="ml-2 flex flex-col stack-y-6">
      {fields.map(
        (field, index) =>
          field.selected && (
            <EventTypeAppSettingsForm
              key={field.fieldId}
              eventType={field}
              loading={props.loading}
              handleDelete={() => {
                const eventTypeDb = eventTypeGroups[groupIndex].eventTypes?.find(
                  (eventType) => eventType.id == field.id
                );
                update(index, {
                  ...field,
                  selected: false,
                  metadata: eventTypeDb?.metadata,
                  bookingFields: eventTypeDb?.bookingFields,
                  ...(eventTypeDb?.locations && { locations: eventTypeDb.locations }),
                });

                setUpdatedEventTypesStatus((prev) => {
                  const res = [...prev];
                  res[groupIndex] = res[groupIndex].filter((item) => !(item.id === field.id));
                  if (!res.some((item) => item.length > 0)) {
                    props.setConfigureStep(false);
                  }
                  return res;
                });
              }}
              onSubmit={(data) => {
                update(index, { ...field, ...data });
                setUpdatedEventTypesStatus((prev) => {
                  const res = [...prev];
                  res[groupIndex] = res[groupIndex].map((item) =>
                    item.id === field.id ? { ...item, updated: true } : item
                  );
                  return res;
                });
              }}
              ref={(el) => {
                submitRefs.current[index] = el;
              }}
              {...props}
            />
          )
      )}
    </div>
  );
};

const ConfigureStepCardContent: FC<ConfigureStepCardProps> = (props) => {
  const { loading, formPortalRef, handleSetUpLater } = props;
  const { t } = useLocale();
  const { control, watch } = useFormContext<TEventTypesForm>();
  const { fields } = useFieldArray({
    control,
    name: "eventTypeGroups",
    keyName: "fieldId",
  });
  const eventTypeGroups = watch("eventTypeGroups");
  const submitRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const mainForSubmitRef = useRef<HTMLButtonElement>(null);
  const [updatedEventTypesStatus, setUpdatedEventTypesStatus] = useState<TUpdatedEventTypesStatus>(
    eventTypeGroups.reduce((arr: Array<{ id: number; updated: boolean }[]>, field) => {
      const selectedEventTypes = field.eventTypes
        .filter((eventType) => eventType.selected)
        .map((eventType) => ({ id: eventType.id as number, updated: false }));

      return [...arr, selectedEventTypes];
    }, [])
  );

  const [submit, setSubmit] = useState(false);
  const allUpdated = updatedEventTypesStatus.every((item) => item.every((iitem) => iitem.updated));

  useEffect(() => {
    if (submit && allUpdated && mainForSubmitRef.current) {
      mainForSubmitRef.current?.click();
      setSubmit(false);
    }
  }, [submit, allUpdated, mainForSubmitRef]);

  if (!formPortalRef?.current) {
    return null;
  }

  return createPortal(
    <div className="mt-8">
      {fields.map((group, groupIndex) => (
        <div key={group.fieldId}>
          {eventTypeGroups[groupIndex].eventTypes.some((eventType) => eventType.selected === true) && (
            <div className="mb-2 mt-4 flex items-center">
              <Avatar
                alt=""
                imageSrc={group.image} // if no image, use default avatar
                size="md"
                className="inline-flex justify-center"
              />
              <p className="text-subtle block pl-2">{group.slug}</p>
            </div>
          )}
          <EventTypeGroup
            groupIndex={groupIndex}
            setUpdatedEventTypesStatus={setUpdatedEventTypesStatus}
            submitRefs={submitRefs}
            {...props}
          />
        </div>
      ))}
      <button form="outer-event-type-form" type="submit" className="hidden" ref={mainForSubmitRef}>
        Save
      </button>
      <Button
        className="text-md mt-6 w-full justify-center"
        type="button"
        data-testid="configure-step-save"
        onClick={() => {
          submitRefs.current.forEach((ref) => ref?.click());
          setSubmit(true);
        }}
        loading={loading}>
        {t("save")}
      </Button>

      <div className="flex w-full flex-row justify-center">
        <Button
          color="minimal"
          data-testid="set-up-later"
          onClick={(event) => {
            event.preventDefault();
            handleSetUpLater();
          }}
          className="mt-8 cursor-pointer px-4 py-2 font-sans text-sm font-medium">
          {t("set_up_later")}
        </Button>
      </div>
    </div>,
    formPortalRef.current
  );
};

export const ConfigureStepCard: FC<ConfigureStepCardProps> = (props) => {
  return (
    <NoSSR>
      <ConfigureStepCardContent {...props} />
    </NoSSR>
  );
};
