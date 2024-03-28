import type { TEventType, TEventTypesForm } from "@pages/apps/installation/[[...step]]";
import type { FC } from "react";
import React, { forwardRef, useEffect, useRef } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { EventTypeAppSettings } from "@calcom/app-store/_components/EventTypeAppSettingsInterface";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AppCategories } from "@calcom/prisma/enums";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { Button, Form } from "@calcom/ui";
import { X } from "@calcom/ui/components/icon";

import useAppsData from "@lib/hooks/useAppsData";

type TFormType = {
  metadata: z.infer<typeof EventTypeMetaDataSchema>;
};

type ConfigureStepCardProps = {
  slug: string;
  userName: string;
  categories: AppCategories[];
  credentialId?: number;
  loading?: boolean;
  selectedEventTypeIds: number[];
};

type EventTypeAppSettingsWrapperProps = {
  slug: string;
  userName: string;
  categories: AppCategories[];
  credentialId?: number;
  eventType: TEventType;
  handleDelete: () => void;
  onSubmit: (values: z.infer<typeof EventTypeMetaDataSchema>) => void;
};

const EventTypeAppSettingsWrapper: FC<
  Omit<EventTypeAppSettingsWrapperProps, "handleDelete" | "onSubmit" | "buttonRef">
> = ({ slug, eventType, categories, credentialId }) => {
  const { t } = useLocale();
  const formMethods = useForm();
  const { shouldLockDisableProps } = useLockedFieldsManager({
    eventType,
    translate: t,
    formMethods,
  });
  const { getAppDataGetter, getAppDataSetter } = useAppsData();

  useEffect(() => {
    const appDataSetter = getAppDataSetter(slug as EventTypeAppsList, categories, credentialId);
    appDataSetter("enabled", true);
  }, []);

  return (
    <EventTypeAppSettings
      slug={slug}
      disabled={shouldLockDisableProps("apps").disabled}
      eventType={eventType}
      getAppData={getAppDataGetter(slug as EventTypeAppsList)}
      setAppData={getAppDataSetter(slug as EventTypeAppsList, categories, credentialId)}
    />
  );
};

const EventTypeAppSettingsForm = forwardRef<HTMLButtonElement, EventTypeAppSettingsWrapperProps>(
  function EventTypeAppSettingsForm(props, ref) {
    const { handleDelete, onSubmit, eventType } = props;

    const formMethods = useForm<TFormType>({
      defaultValues: {
        metadata: eventType?.metadata,
      },
    });

    return (
      <Form
        form={formMethods}
        id={`eventtype-${eventType.id}`}
        handleSubmit={() => {
          const data = formMethods.getValues("metadata");
          onSubmit(data);
        }}>
        <div>
          <div className="sm:border-subtle bg-default relative border p-4 sm:rounded-md dark:bg-black">
            <div>
              <span className="text-default font-semibold ltr:mr-1 rtl:ml-1">{eventType.title}</span>{" "}
              <small className="text-subtle hidden font-normal sm:inline">
                /{eventType.team ? eventType.team.slug : props.userName}/{eventType.slug}
              </small>
            </div>
            <EventTypeAppSettingsWrapper {...props} />
            <X className="absolute right-4 top-4 h-4 w-4 cursor-pointer" onClick={() => handleDelete()} />
            <button type="submit" ref={ref}>
              Save
            </button>
          </div>
        </div>
      </Form>
    );
  }
);

export const ConfigureStepCard: FC<ConfigureStepCardProps> = ({
  loading,
  selectedEventTypeIds,
  ...props
}) => {
  const { control } = useFormContext<TEventTypesForm>();
  const { fields, update } = useFieldArray({
    control,
    name: "eventTypes",
    keyName: "fieldId",
  });
  const submitRefs = useRef<Array<React.RefObject<HTMLButtonElement>>>([]);
  submitRefs.current = selectedEventTypeIds.map(
    (_ref, index) => (submitRefs.current[index] = React.createRef<HTMLButtonElement>())
  );

  return (
    <div className="mt-8">
      <div className="flex flex-col space-y-6">
        {fields.map((field, index) => {
          return (
            field.selected && (
              <EventTypeAppSettingsForm
                key={field.fieldId}
                eventType={field}
                handleDelete={() => {
                  update(index, { ...field, selected: false });
                }}
                onSubmit={(data) => {
                  console.log("ddatadatadatadataata: ", data);
                  update(index, { ...field, metadata: data });
                }}
                ref={submitRefs.current[index]}
                {...props}
              />
            )
          );
        })}
      </div>
      <Button
        className="text-md mt-6 w-full justify-center"
        onClick={() => {
          // submitRefs.current[0].current?.click();
          submitRefs.current.map((ref) => ref.current?.click());
        }}
        loading={loading}>
        Save
      </Button>
    </div>
  );
};
