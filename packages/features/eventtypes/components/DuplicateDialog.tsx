import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@calid/features/ui/components/dialog";
import { Form, FormField } from "@calid/features/ui/components/form/form";
import { TextField } from "@calid/features/ui/components/input/input";
import { triggerToast } from "@calid/features/ui/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { MIN_EVENT_DURATION_MINUTES, MAX_EVENT_DURATION_MINUTES } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { HttpError } from "@calcom/lib/http-error";
import { md } from "@calcom/lib/markdownIt";
import slugify from "@calcom/lib/slugify";
import turndown from "@calcom/lib/turndownService";
import { EventTypeDuplicateInput } from "@calcom/prisma/zod/custom/eventtype";
import { trpc } from "@calcom/trpc/react";
import { Editor } from "@calcom/ui/components/editor";
import { revalidateEventTypesList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/event-types/actions";

const querySchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  slug: z.string(),
  id: z.coerce.number(),
  length: z.coerce.number(),
  pageSlug: z.string(),
  teamId: z.coerce.number().optional().nullable(),
  parentId: z.coerce.number().optional().nullable(),
});

interface DuplicateDialogProps {
  name?: string;
  clearQueryParamsOnClose?: string[];
}

const DuplicateDialog = ({ name = "duplicate", clearQueryParamsOnClose }: DuplicateDialogProps) => {
  const utils = trpc.useUtils();
  const searchParams = useCompatSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();

  const isOpen = searchParams?.get("dialog") === name;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      const newSearchParams = new URLSearchParams(searchParams?.toString() ?? "");
      const paramsToClear = ["dialog", ...(clearQueryParamsOnClose || [])];
      paramsToClear.forEach((param) => newSearchParams.delete(param));
      const query = newSearchParams.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    }
  };
  const [firstRender, setFirstRender] = useState(true);
  const {
    data: { pageSlug, slug, ...defaultValues },
  } = useTypedQuery(querySchema);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // react hook form
  const form = useForm({
    defaultValues: {
      slug: t("event_type_duplicate_copy_text", { slug }),
      ...defaultValues,
    },
    resolver: zodResolver(EventTypeDuplicateInput),
  });

  useEffect(() => {
    if (searchParams?.get("dialog") === name) {
      form.setValue("id", Number(searchParams?.get("id") as string) || -1);
      form.setValue("title", (searchParams?.get("title") as string) || "");
      form.setValue(
        "slug",
        t("event_type_duplicate_copy_text", { slug: searchParams?.get("slug") as string })
      );
      form.setValue("description", (searchParams?.get("description") as string) || "");
      form.setValue("length", Number(searchParams?.get("length")) || 30);
    }
  }, [searchParams?.get("dialog"), name, form, t]);

  const duplicateMutation = trpc.viewer.eventTypes.duplicate.useMutation({
    onSuccess: async ({ eventType }) => {
      await router.replace(`/event-types/${eventType.id}`);

      await utils.viewer.eventTypes.getUserEventGroups.invalidate();
      revalidateEventTypesList();
      await utils.viewer.eventTypes.getEventTypesFromGroup.invalidate({
        limit: 10,
        searchQuery: debouncedSearchTerm,
        group: { teamId: eventType?.teamId, parentId: eventType?.parentId },
      });

      triggerToast(
        t("event_type_created_successfully", {
          eventTypeTitle: eventType.title,
        }),
        "success"
      );
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        triggerToast(message, "error");
      }

      if (err.data?.code === "INTERNAL_SERVER_ERROR" || err.data?.code === "BAD_REQUEST") {
        const message = t("unexpected_error_try_again");
        triggerToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED" || err.data?.code === "FORBIDDEN") {
        const message = `${err.data.code}: ${t("error_event_type_unauthorized_create")}`;
        triggerToast(message, "error");
      }
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("duplicate_event_type")}</DialogTitle>
          <DialogDescription>{t("duplicate_event_type_description")}</DialogDescription>
        </DialogHeader>
        <Form
          form={form}
          onSubmit={(values) => {
            duplicateMutation.mutate(values);
          }}>
          <div className="space-y-6">
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

            <FormField
              name="slug"
              control={form.control}
              render={({ field: { value, onChange }, fieldState: { error } }) => {
                const urlPrefix = process.env.NEXT_PUBLIC_WEBSITE_URL ?? "";
                const displayValue = value ? slugify(value, true) : "";
                return (
                  <TextField
                    name="slug"
                    label={t("url")}
                    required
                    showAsteriskIndicator
                    addOnLeading={
                      urlPrefix ? (
                        <span className="text-muted inline-block min-w-0 max-w-24 overflow-hidden whitespace-nowrap md:max-w-56">
                          {urlPrefix}/{pageSlug}/
                        </span>
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
                />
              )}
            />

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
                  value={value ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onChange(e?.target.value ? Number(e.target.value) : undefined)
                  }
                  addOnSuffix={t("minutes")}
                  error={error ? error.message : undefined}
                />
              )}
            />
          </div>
          <DialogFooter>
            <DialogClose />
            <Button StartIcon="plus" data-testid="create" type="submit" loading={duplicateMutation.isPending}>
              {t("create")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export { DuplicateDialog };
