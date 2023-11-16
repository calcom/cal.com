import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { HttpError } from "@calcom/lib/http-error";
import { md } from "@calcom/lib/markdownIt";
import slugify from "@calcom/lib/slugify";
import turndown from "@calcom/lib/turndownService";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  Form,
  showToast,
  TextField,
  Editor,
} from "@calcom/ui";

const querySchema = z.object({
  title: z.string(),
  description: z.string().default(""),
  slug: z.string(),
  id: z.coerce.number(),
  length: z.coerce.number(),
  pageSlug: z.string(),
});

const DuplicateDialog = () => {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();
  const router = useRouter();
  const [firstRender, setFirstRender] = useState(true);
  const {
    data: { pageSlug, slug, ...defaultValues },
  } = useTypedQuery(querySchema);

  // react hook form
  const form = useForm({
    defaultValues: {
      slug: t("event_type_duplicate_copy_text", { slug }),
      ...defaultValues,
    },
  });
  const { register } = form;

  useEffect(() => {
    if (searchParams?.get("dialog") === "duplicate") {
      form.setValue("id", Number(searchParams?.get("id") as string) || -1);
      form.setValue("title", (searchParams?.get("title") as string) || "");
      form.setValue(
        "slug",
        t("event_type_duplicate_copy_text", { slug: searchParams?.get("slug") as string })
      );
      form.setValue("description", (searchParams?.get("description") as string) || "");
      form.setValue("length", Number(searchParams?.get("length")) || 30);
    }
  }, [searchParams?.get("dialog")]);

  const duplicateMutation = trpc.viewer.eventTypes.duplicate.useMutation({
    onSuccess: async ({ eventType }) => {
      await router.replace(`/event-types/${eventType.id}`);
      showToast(
        t("event_type_created_successfully", {
          eventTypeTitle: eventType.title,
        }),
        "success"
      );
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "INTERNAL_SERVER_ERROR" || err.data?.code === "BAD_REQUEST") {
        const message = t("unexpected_error_try_again");
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED" || err.data?.code === "FORBIDDEN") {
        const message = `${err.data.code}: ${t("error_event_type_unauthorized_create")}`;
        showToast(message, "error");
      }
    },
  });

  return (
    <Dialog
      name="duplicate"
      clearQueryParamsOnClose={["description", "title", "length", "slug", "name", "id", "pageSlug"]}>
      <DialogContent type="creation" className="overflow-y-auto" title="Duplicate Event Type">
        <Form
          form={form}
          handleSubmit={(values) => {
            duplicateMutation.mutate(values);
          }}>
          <div className="-mt-2 space-y-5">
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
              firstRender={firstRender}
              setFirstRender={setFirstRender}
            />

            <div className="relative">
              <TextField
                type="number"
                required
                min="1"
                placeholder="15"
                label={t("duration")}
                {...register("length", { valueAsNumber: true })}
                addOnSuffix={t("minutes")}
              />
            </div>
          </div>
          <DialogFooter showDivider className="mt-10">
            <DialogClose />
            <Button type="submit" loading={duplicateMutation.isLoading}>
              {t("continue")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export { DuplicateDialog };
