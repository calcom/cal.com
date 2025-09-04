"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField, TextAreaField } from "@calcom/ui/components/form";
import { SheetFooter } from "@calcom/ui/components/sheet";

const teamEditSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  bio: z.string().optional(),
  brandColor: z.string().optional(),
  darkBrandColor: z.string().optional(),
  bannerUrl: z.string().url().optional().or(z.literal("")),
  timeFormat: z.number().optional(),
  timeZone: z.string().optional(),
  weekStart: z.string().optional(),
});

type TeamEditFormData = z.infer<typeof teamEditSchema>;

interface TeamsFormProps {
  defaultValues?: Partial<TeamEditFormData>;
  onSubmit: (data: TeamEditFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isOrganization?: boolean;
  onEditOrgSettings?: () => void;
}

export function TeamsForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  isOrganization = false,
  onEditOrgSettings,
}: TeamsFormProps) {
  const { t } = useLocale();

  const form = useForm<TeamEditFormData>({
    resolver: zodResolver(teamEditSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      slug: defaultValues?.slug || "",
      bio: defaultValues?.bio || "",
      brandColor: defaultValues?.brandColor || "",
      darkBrandColor: defaultValues?.darkBrandColor || "",
      bannerUrl: defaultValues?.bannerUrl || "",
      timeFormat: defaultValues?.timeFormat || undefined,
      timeZone: defaultValues?.timeZone || "",
      weekStart: defaultValues?.weekStart || "",
    },
  });

  return (
    <Form form={form} handleSubmit={onSubmit}>
      <div className="space-y-4 py-4">
        <TextField
          label={t("team_name")}
          {...form.register("name")}
          error={form.formState.errors.name?.message}
        />

        <TextField
          label={t("team_slug")}
          {...form.register("slug")}
          error={form.formState.errors.slug?.message}
        />

        <TextAreaField label={t("team_bio")} {...form.register("bio")} />

        <TextField
          label={t("brand_color")}
          type="color"
          {...form.register("brandColor")}
          error={form.formState.errors.brandColor?.message}
        />

        <TextField
          label={t("dark_brand_color")}
          type="color"
          {...form.register("darkBrandColor")}
          error={form.formState.errors.darkBrandColor?.message}
        />

        <TextField
          label={t("banner_url")}
          type="url"
          {...form.register("bannerUrl")}
          error={form.formState.errors.bannerUrl?.message}
        />

        <TextField
          label={t("time_format")}
          type="number"
          {...form.register("timeFormat", { valueAsNumber: true })}
          error={form.formState.errors.timeFormat?.message}
        />

        <TextField
          label={t("timezone")}
          {...form.register("timeZone")}
          error={form.formState.errors.timeZone?.message}
        />

        <TextField
          label={t("week_start")}
          {...form.register("weekStart")}
          error={form.formState.errors.weekStart?.message}
        />

        {isOrganization && onEditOrgSettings && (
          <div className="border-t pt-4">
            <Button type="button" color="secondary" onClick={onEditOrgSettings} className="w-full">
              {t("edit_organization_settings")}
            </Button>
          </div>
        )}
      </div>

      <SheetFooter>
        <Button type="button" color="secondary" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit" loading={isLoading}>
          {t("save_changes")}
        </Button>
      </SheetFooter>
    </Form>
  );
}
