import { zodResolver } from "@hookform/resolvers/zod";
import { SchedulingType } from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import MarkdownIt from "markdown-it";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { HttpError } from "@calcom/lib/http-error";
import slugify from "@calcom/lib/slugify";
import turndown from "@calcom/lib/turndownService";
import { createEventTypeInput } from "@calcom/prisma/zod/custom/eventtype";
import { trpc } from "@calcom/trpc/react";
import {
  Alert,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  Form,
  RadioGroup as RadioArea,
  showToast,
  TextField,
  Editor,
} from "@calcom/ui";

const md = new MarkdownIt("default", { html: true, breaks: true, linkify: true });

// this describes the uniform data needed to create a new event type on Profile or Team
export interface EventTypeParent {
  teamId: number | null | undefined; // if undefined, then it's a profile
  name?: string | null;
  slug?: string | null;
  image?: string | null;
}

const locationFormSchema = z.array(
  z.object({
    locationType: z.string(),
    locationAddress: z.string().optional(),
    displayLocationPublicly: z.boolean().optional(),
    locationPhoneNumber: z
      .string()
      .refine((val) => isValidPhoneNumber(val))
      .optional(),
    locationLink: z.string().url().optional(), // URL validates as new URL() - which requires HTTPS:// In the input field
  })
);

const querySchema = z.object({
  eventPage: z.string(),
  teamId: z.union([z.string().transform((val) => +val), z.number()]).optional(),
  title: z.string().optional(),
  slug: z.string().optional(),
  length: z.union([z.string().transform((val) => +val), z.number()]).optional(),
  description: z.string().optional(),
  schedulingType: z.nativeEnum(SchedulingType).optional(),
  locations: z
    .string()
    .transform((jsonString) => locationFormSchema.parse(JSON.parse(jsonString)))
    .optional(),
});

export default function CreateEventTypeDialog() {
  const { t } = useLocale();
  const router = useRouter();

  const {
    data: { teamId, eventPage: pageSlug },
  } = useTypedQuery(querySchema);

  const form = useForm<z.infer<typeof createEventTypeInput>>({
    defaultValues: {
      length: 15,
    },
    resolver: zodResolver(createEventTypeInput),
  });

  const { register } = form;

  const createMutation = trpc.viewer.eventTypes.create.useMutation({
    onSuccess: async ({ eventType }) => {
      await router.replace("/event-types/" + eventType.id);
      showToast(t("event_type_created_successfully", { eventTypeTitle: eventType.title }), "success");
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "BAD_REQUEST") {
        const message = `${err.data.code}: URL already exists.`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: You are not able to create this event`;
        showToast(message, "error");
      }
    },
  });

  return (
    <Dialog
      name="new"
      clearQueryParamsOnClose={[
        "eventPage",
        "teamId",
        "type",
        "description",
        "title",
        "length",
        "slug",
        "locations",
      ]}>
      <DialogContent
        type="creation"
        enableOverflow
        title={teamId ? t("add_new_team_event_type") : t("add_new_event_type")}
        description={t("new_event_type_to_book_description")}>
        <Form
          form={form}
          handleSubmit={(values) => {
            createMutation.mutate(values);
          }}>
          <div className="mt-3 space-y-6">
            {teamId && (
              <TextField
                type="hidden"
                labelProps={{ style: { display: "none" } }}
                {...register("teamId", { valueAsNumber: true })}
                value={teamId}
              />
            )}
            <TextField
              label={t("title")}
              placeholder={t("quick_chat")}
              {...register("title")}
              onChange={(e) => {
                form.setValue("title", e?.target.value);
                if (form.formState.touchedFields["slug"] === undefined) {
                  form.setValue("slug", slugify(e?.target.value));
                }
              }}
            />

            {process.env.NEXT_PUBLIC_WEBSITE_URL !== undefined &&
            process.env.NEXT_PUBLIC_WEBSITE_URL?.length >= 21 ? (
              <TextField
                label={`${t("url")}: ${process.env.NEXT_PUBLIC_WEBSITE_URL}`}
                required
                addOnLeading={<>/{pageSlug}/</>}
                {...register("slug")}
                onChange={(e) => {
                  form.setValue("slug", slugify(e?.target.value), { shouldTouch: true });
                }}
              />
            ) : (
              <TextField
                label={t("url")}
                required
                addOnLeading={
                  <>
                    {process.env.NEXT_PUBLIC_WEBSITE_URL}/{pageSlug}/
                  </>
                }
                {...register("slug")}
              />
            )}

            <Editor
              getText={() => md.render(form.getValues("description") || "")}
              setText={(value: string) => form.setValue("description", turndown(value))}
              excludedToolbarItems={["blockType", "link"]}
              placeholder={t("quick_video_meeting")}
            />

            <div className="relative">
              <TextField
                type="number"
                required
                min="10"
                placeholder="15"
                label={t("length")}
                className="pr-4"
                {...register("length", { valueAsNumber: true })}
                addOnSuffix={t("minutes")}
              />
            </div>

            {teamId && (
              <div className="mb-4">
                <label htmlFor="schedulingType" className="block text-sm font-bold text-gray-700">
                  {t("scheduling_type")}
                </label>
                {form.formState.errors.schedulingType && (
                  <Alert
                    className="mt-1"
                    severity="error"
                    message={form.formState.errors.schedulingType.message}
                  />
                )}
                <RadioArea.Group className="mt-1 flex space-x-4">
                  <RadioArea.Item
                    {...register("schedulingType")}
                    value={SchedulingType.COLLECTIVE}
                    className="w-1/2 text-sm">
                    <strong className="mb-1 block">{t("collective")}</strong>
                    <p>{t("collective_description")}</p>
                  </RadioArea.Item>
                  <RadioArea.Item
                    {...register("schedulingType")}
                    value={SchedulingType.ROUND_ROBIN}
                    className="w-1/2 text-sm">
                    <strong className="mb-1 block">{t("round_robin")}</strong>
                    <p>{t("round_robin_description")}</p>
                  </RadioArea.Item>
                </RadioArea.Group>
              </div>
            )}
          </div>
          <div className="mt-8 flex flex-row-reverse gap-x-2">
            <Button type="submit" loading={createMutation.isLoading}>
              {t("continue")}
            </Button>
            <DialogClose />
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
