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
  MINUTES = "Mins",
  HOURS = "Hours",
  DAYS = "Days",
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
      label: t("Mins"),
      value: EventDurationConfig.MINUTES,
    },
    {
      label: t("Hours"),
      value: EventDurationConfig.HOURS,
    },
    {
      label: t("Days"),
      value: EventDurationConfig.DAYS,
    },
  ];

  const isPlatform = useIsPlatform();
  const [firstRender, setFirstRender] = useState(true);
  const [selectedDurationUnit, setSelectedDurationUnit] = useState(durationOptions[0]);
  const [displayedDuration, setDisplayedDuration] = useState<number>(15);

  // setValue and watch are for time format handling
  const { register, setValue } = form;

  const getConvertedDuration = () => {
    if (selectedDurationUnit.value === EventDurationConfig.HOURS) {
      return displayedDuration * 60; // Horas a minutos
    }
    if (selectedDurationUnit.value === EventDurationConfig.DAYS) {
      return displayedDuration * 1440; // Días a minutos
    }
    return displayedDuration; // Minutos
  };

  return (
    <Form
      form={form}
      handleSubmit={(values) => {
        const convertedDuration = getConvertedDuration();
        setValue("length", convertedDuration); // Asigna el valor correcto antes de enviar
        handleSubmit({ ...values, length: convertedDuration });
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
          <div className="flex items-center space-x-1">
            <TextField
              type="number"
              required
              min="1"
              placeholder="15"
              value={displayedDuration}
              onChange={(e) => setDisplayedDuration(parseFloat(e.target.value))}
              label={t("duration")}
              className="h-10 w-24 flex-grow rounded border border-gray-600 "
              style={{ lineHeight: "normal" }}
            />
            <Select
              options={durationOptions}
              value={selectedDurationUnit}
              onChange={(e) => {
                if (e) {
                  setSelectedDurationUnit(e);
                }
              }}
              className="h-10 w-24 self-stretch rounded border border-gray-600"
            />
          </div>
        </>
      </div>
      {SubmitButton(isPending)}
    </Form>
  );
}
