import type { ReactNode } from "react";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import type { CreateEventTypeFormValues } from "@calcom/features/eventtypes/hooks/useCreateEventType";
import { MAX_EVENT_DURATION_MINUTES, MIN_EVENT_DURATION_MINUTES } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import slugify from "@calcom/lib/slugify";
import turndown from "@calcom/lib/turndownService";
import { Editor } from "@calcom/ui/components/editor";
import { Form } from "@calcom/ui/components/form";
import { TextAreaField } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { Tooltip } from "@calcom/ui/components/tooltip";

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
  const isPlatform = useIsPlatform();
  const { t } = useLocale();
  const [firstRender, setFirstRender] = useState(true);

  const { register } = form;
  return (
    <Form
      form={form}
      handleSubmit={(values) => {
        handleSubmit(values);
      }}>
      <div className="mt-3 stack-y-6 pb-11">
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
                  <span className="max-w-24 md:max-w-56 inline-block overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                    {`/${!isManagedEventType ? pageSlug : t("username_placeholder")}/`}
                  </span>
                ) : undefined
              }
              containerClassName="[&>div]:gap-0"
              className="pl-0"
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
                    <span className="max-w-24 md:max-w-56 inline-block overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                      {`${urlPrefix}/${!isManagedEventType ? pageSlug : t("username_placeholder")}/`}
                    </span>
                  </Tooltip>
                ) : undefined
              }
              containerClassName="[&>div]:gap-0"
              className="pl-0"
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
              label={t("description")}
              getText={() => md.render(form.getValues("description") || "")}
              setText={(value: string) => form.setValue("description", turndown(value))}
              excludedToolbarItems={["blockType", "link"]}
              placeholder={t("quick_video_meeting")}
              firstRender={firstRender}
              setFirstRender={setFirstRender}
              maxHeight="200px"
            />
          )}

          <div className="relative">
            <TextField
              type="number"
              required
              min={MIN_EVENT_DURATION_MINUTES}
              max={MAX_EVENT_DURATION_MINUTES}
              placeholder="15"
              label={t("duration")}
              className="pr-4"
              {...register("length", {
                valueAsNumber: true,
                min: {
                  value: MIN_EVENT_DURATION_MINUTES,
                  message: t("duration_min_error", { min: MIN_EVENT_DURATION_MINUTES }),
                },
                max: {
                  value: MAX_EVENT_DURATION_MINUTES,
                  message: t("duration_max_error", { max: MAX_EVENT_DURATION_MINUTES }),
                },
              })}
              addOnSuffix={t("minutes").toLowerCase()}
            />
          </div>
        </>
      </div>
      {SubmitButton(isPending)}
    </Form>
  );
}
