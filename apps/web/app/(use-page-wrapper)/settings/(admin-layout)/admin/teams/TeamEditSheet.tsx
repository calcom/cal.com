"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField, TextAreaField } from "@calcom/ui/components/form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@calcom/ui/components/sheet";
import { showToast } from "@calcom/ui/components/toast";

import { OrganizationSettingsSheet } from "./OrganizationSettingsSheet";

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

interface TeamEditSheetProps {
  teamId: number;
  open: boolean;
  onClose: () => void;
}

export function TeamEditSheet({ teamId, open, onClose }: TeamEditSheetProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [showOrgSettings, setShowOrgSettings] = useState(false);

  const { data: team, isLoading } = trpc.viewer.admin.teams.get.useQuery({ teamId }, { enabled: open });

  const form = useForm<TeamEditFormData>({
    resolver: zodResolver(teamEditSchema),
    defaultValues: {
      name: team?.name || "",
      slug: team?.slug || "",
      bio: team?.bio || "",
      brandColor: team?.brandColor || "",
      darkBrandColor: team?.darkBrandColor || "",
      bannerUrl: team?.bannerUrl || "",
      timeFormat: team?.timeFormat || undefined,
      timeZone: team?.timeZone || "",
      weekStart: team?.weekStart || "",
    },
  });

  const updateTeamMutation = trpc.viewer.admin.teams.update.useMutation({
    onSuccess: () => {
      showToast(t("team_updated_successfully"), "success");
      utils.viewer.admin.teams.listPaginated.invalidate();
      utils.viewer.admin.teams.get.invalidate({ teamId });
      onClose();
    },
    onError: (error) => {
      showToast(error.message || t("error_updating_team"), "error");
    },
  });

  const onSubmit = (data: TeamEditFormData) => {
    updateTeamMutation.mutate({
      teamId,
      data,
    });
  };

  if (team && !form.formState.isDirty) {
    form.reset({
      name: team.name,
      slug: team.slug || "",
      bio: team.bio || "",
      brandColor: team.brandColor || "",
      darkBrandColor: team.darkBrandColor || "",
      bannerUrl: team.bannerUrl || "",
      timeFormat: team.timeFormat || undefined,
      timeZone: team.timeZone || "",
      weekStart: team.weekStart || "",
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>{t("edit_team")}</SheetTitle>
            <SheetDescription>{t("edit_team_description")}</SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-subtle">{t("loading")}</div>
            </div>
          ) : (
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

                {team?.isOrganization && (
                  <div className="border-t pt-4">
                    <Button
                      type="button"
                      color="secondary"
                      onClick={() => setShowOrgSettings(true)}
                      className="w-full">
                      {t("edit_organization_settings")}
                    </Button>
                  </div>
                )}
              </div>

              <SheetFooter>
                <Button type="button" color="secondary" onClick={onClose}>
                  {t("cancel")}
                </Button>
                <Button type="submit" loading={updateTeamMutation.isPending}>
                  {t("save_changes")}
                </Button>
              </SheetFooter>
            </Form>
          )}
        </SheetContent>
      </Sheet>

      {team?.isOrganization && (
        <OrganizationSettingsSheet
          teamId={teamId}
          organizationSettings={team.organizationSettings}
          open={showOrgSettings}
          onClose={() => setShowOrgSettings(false)}
        />
      )}
    </>
  );
}
