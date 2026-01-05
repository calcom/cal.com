import { Form, FormField } from "@calid/features/ui/components/form";
import { TextField } from "@calid/features/ui/components/input/input";
import { TextAreaField } from "@calid/features/ui/components/input/text-area";
import { Label } from "@calid/features/ui/components/label";
import type { ReactNode } from "react";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import { MAX_EVENT_DURATION_MINUTES, MIN_EVENT_DURATION_MINUTES } from "@calcom/lib/constants";
import type { CreateEventTypeFormValues } from "@calcom/lib/hooks/useCreateEventType";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import slugify from "@calcom/lib/slugify";
import turndown from "@calcom/lib/turndownService";
import { Editor } from "@calcom/ui/components/editor";
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

  return (
    <Form
      form={form}
      {...form}
      onSubmit={(values) => {
        handleSubmit(values);
      }}>
      <div className="mt-3 space-y-6 pb-11">
        <FormField
          name="title"
          control={form.control}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <TextField
              name="title"
              label={t("title")}
              required
              showAsteriskIndicator
              placeholder={t("quick_chat")}
              data-testid="event-type-quick-chat"
              value={value || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const next = e?.target.value;
                onChange(next);
                if (form.formState.touchedFields["slug"] === undefined) {
                  form.setValue("slug", slugify(next));
                }
              }}
              error={error ? error.message : undefined}
            />
          )}
        />

        {urlPrefix && (
          <div>
            <FormField
              name="slug"
              control={form.control}
              render={({ field: { value, onChange }, fieldState: { error } }) => {
                const displayValue = value ? slugify(value, true) : "";
                return (
                  <TextField
                    name="slug"
                    label={isPlatform ? "Slug" : t("url")}
                    required
                    showAsteriskIndicator
                    addOnLeading={
                      !isPlatform ? (
                        <Tooltip
                          content={`${urlPrefix}/${
                            !isManagedEventType ? pageSlug : t("username_placeholder")
                          }/`}>
                          <span className="inline-block min-w-0 max-w-24 overflow-hidden whitespace-nowrap md:max-w-56">
                            {urlPrefix}/{!isManagedEventType ? pageSlug : t("username_placeholder")}/
                          </span>
                        </Tooltip>
                      ) : undefined
                    }
                    value={displayValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const slugifiedValue = slugify(e?.target.value, true);
                      onChange(slugifiedValue);
                      form.setValue("slug", slugifiedValue, { shouldTouch: true });
                    }}
                    error={error ? error.message : undefined}
                  />
                );
              }}
            />

            {isManagedEventType && !isPlatform && (
              <p className="mt-2 text-sm text-gray-600">{t("managed_event_url_clarification")}</p>
            )}
          </div>
        )}
        <>
          {isPlatform ? (
            <FormField
              name="description"
              control={form.control}
              render={({ field: { value, onChange } }) => (
                <TextAreaField
                  name="description"
                  label={t("description")}
                  placeholder={t("quick_video_meeting")}
                  value={value || ""}
                  onChange={(e) => onChange(e?.target.value)}
                />
              )}
            />
          ) : (
            <div>
              <Label htmlFor="editor">{t("description")}</Label>
              <FormField
                name="description"
                control={form.control}
                render={() => (
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
              />
            </div>
          )}

          <div className="relative">
            <FormField
              name="length"
              control={form.control}
              rules={{
                min: {
                  value: MIN_EVENT_DURATION_MINUTES,
                  message: t("duration_min_error", { min: MIN_EVENT_DURATION_MINUTES }),
                },
                max: {
                  value: MAX_EVENT_DURATION_MINUTES,
                  message: t("duration_max_error", { max: MAX_EVENT_DURATION_MINUTES }),
                },
              }}
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <TextField
                  name="length"
                  type="number"
                  required
                  showAsteriskIndicator
                  min={MIN_EVENT_DURATION_MINUTES}
                  max={MAX_EVENT_DURATION_MINUTES}
                  placeholder="15"
                  label={t("duration")}
                  className="pr-4"
                  value={value || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(Number(e?.target.value))}
                  addOnSuffix={t("minutes")}
                  error={error ? error.message : undefined}
                />
              )}
            />
          </div>
        </>
      </div>
      {SubmitButton(isPending)}
    </Form>
  );
}
