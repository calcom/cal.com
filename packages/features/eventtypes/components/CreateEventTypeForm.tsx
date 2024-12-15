import type { ReactNode } from "react";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { useIsPlatform } from "@calcom/atoms/monorepo";
import type { CreateEventTypeFormValues } from "@calcom/lib/hooks/useCreateEventType";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import slugify from "@calcom/lib/slugify";
import turndown from "@calcom/lib/turndownService";
import { Editor, Form, TextAreaField, TextField, Tooltip, Select } from "@calcom/ui";

enum EventDurationConfig {
  MINUTES = "minutes",
  HOURS = "hours",
  DAYS = "days",
}

export default function CreateEventTypeForm({
  form,
  isManagedEventType,
  handleSubmit,
  pageSlug,
  isPending,
  urlPrefix,
  SubmitButton,
}: {
  form: UseFormReturn<CreateEventTypeFormValues>;
  isManagedEventType: boolean;
  handleSubmit: (values: CreateEventTypeFormValues) => void;
  pageSlug?: string;
  isPending: boolean;
  urlPrefix?: string;
  SubmitButton: (isPending: boolean) => ReactNode;
}) {
  const { t } = useLocale();
  const durationOptions = [
    {
      label: t("minutes"),
      value: EventDurationConfig.MINUTES,
    },
    {
      label: t("hours"),
      value: EventDurationConfig.HOURS,
    },
    {
      label: t("days"),
      value: EventDurationConfig.DAYS,
    },
  ];

  const isPlatform = useIsPlatform();
  const [firstRender, setFirstRender] = useState(true);
  const [selectedDurationUnit, setSelectedDurationUnit] = useState(
    durationOptions.find((option) => option.value === EventDurationConfig.MINUTES)
  );

  // setValue and watch are for time format handling
  const { register, setValue, watch } = form;
  const duration = watch("length");

  const handleDurationChange = (value: number) => {
    console.log(value);
    if (selectedDurationUnit === EventDurationConfig.HOURS) {
      setValue("length", value * 60); // Convert hours to minutes
    } else if (selectedDurationUnit === EventDurationConfig.DAYS) {
      setValue("length", value * 1440); // Convert days to minutes
    } else {
      setValue("length", Math.round(value)); // Minutes
    }
  };

  return (
    <Form
      form={form}
      handleSubmit={(values) => {
        handleSubmit(values);
      }}>
      <div className="mt-3 space-y-6 pb-11">
        <TextField
          label={t("title")}
          placeholder={t("quick_chat")}
          data-testid="event-type-quick-chat"
          {...register("title")}
          onChange={(e) => {
            form.setValue("title", e?.target.value);
            if (form.formState.touchedFields["slug"] === undefined) {
              form.setValue("slug", slugify(e?.target.value));
            }
          }}
        />

        {urlPrefix && urlPrefix.length >= 21 ? (
          <div>
            <TextField
              label={isPlatform ? "Slug" : `${t("url")}: ${urlPrefix}`}
              required
              addOnLeading={
                !isPlatform ? (
                  <Tooltip content={!isManagedEventType ? pageSlug : t("username_placeholder")}>
                    <span className="max-w-24 md:max-w-56">
                      /{!isManagedEventType ? pageSlug : t("username_placeholder")}/
                    </span>
                  </Tooltip>
                ) : undefined
              }
              {...register("slug")}
              onChange={(e) => {
                form.setValue("slug", slugify(e?.target.value), { shouldTouch: true });
              }}
            />

            {isManagedEventType && !isPlatform && (
              <p className="mt-2 text-sm text-gray-600">{t("managed_event_url_clarification")}</p>
            )}
          </div>
        ) : (
          <div>
            <TextField
              label={isPlatform ? "Slug" : t("url")}
              required
              addOnLeading={
                !isPlatform ? (
                  <Tooltip
                    content={`${urlPrefix}/${!isManagedEventType ? pageSlug : t("username_placeholder")}/`}>
                    <span className="max-w-24 md:max-w-56">
                      {urlPrefix}/{!isManagedEventType ? pageSlug : t("username_placeholder")}/
                    </span>
                  </Tooltip>
                ) : undefined
              }
              {...register("slug")}
              onChange={(e) => {
                form.setValue("slug", slugify(e?.target.value), { shouldTouch: true });
              }}
            />
            {isManagedEventType && !isPlatform && (
              <p className="mt-2 text-sm text-gray-600">{t("managed_event_url_clarification")}</p>
            )}
          </div>
        )}
        <>
          {isPlatform ? (
            <TextAreaField {...register("description")} placeholder={t("quick_video_meeting")} />
          ) : (
            <Editor
              getText={() => md.render(form.getValues("description") || "")}
              setText={(value: string) => form.setValue("description", turndown(value))}
              excludedToolbarItems={["blockType", "link"]}
              placeholder={t("quick_video_meeting")}
              firstRender={firstRender}
              setFirstRender={setFirstRender}
              maxHeight="200px"
            />
          )}

          <div className="flex items-center space-x-4">
            <TextField
              type="number"
              required
              min="10"
              placeholder="15"
              label={t("duration")}
              className="flex-grow pr-4"
              {...register("length", {
                valueAsNumber: true,
                onChange: (e) => handleDurationChange(parseFloat(e.target.value)),
              })}
              //addOnSuffix={t("minutes")}
            />
            <Select
              options={durationOptions}
              value={selectedDurationUnit}
              onChange={(e) => setSelectedDurationUnit(e)}
              className="w-24"
            />
          </div>
        </>
      </div>
      {SubmitButton(isPending)}
    </Form>
  );
}
