"use client";

import { Avatar } from "@calid/features/ui/components/avatar";
import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@calid/features/ui/components/dialog";
import { Form, FormField, FormMessage } from "@calid/features/ui/components/form";
import { Input } from "@calid/features/ui/components/input/input";
import { triggerToast } from "@calid/features/ui/components/toast/toast";
import { CustomImageUploader } from "@calid/features/ui/components/uploader";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import turndown from "@calcom/lib/turndownService";
import { trpc } from "@calcom/trpc/react";
import { Editor } from "@calcom/ui/components/editor";
import { Label } from "@calcom/ui/components/form";

const regex = new RegExp("^[a-zA-Z0-9-]*$");

const teamProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z
    .string()
    .regex(regex, {
      message: "Url can only contain letters, numbers, and hyphens",
    })
    .min(1, { message: "Url cannot be left empty" }),
  bio: z.string(),
  logo: z.string().nullable(),
});

type TeamProfileFormData = z.infer<typeof teamProfileSchema>;

interface TeamProfileViewProps {
  teamId: number;
}

export default function TeamProfileView({ teamId }: TeamProfileViewProps) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [firstRender, setFirstRender] = useState(true);
  const [open, setOpen] = useState(false);

  const form = useForm<TeamProfileFormData>({
    resolver: zodResolver(teamProfileSchema),
    defaultValues: {
      id: 0,
      name: "",
      slug: "",
      bio: "",
      logo: "",
    },
  });

  const isDisabled = form.formState.isSubmitting;

  // Fetch team data
  const { data: team, isLoading, error } = trpc.viewer.teams.get.useQuery({ teamId }, { enabled: !!teamId });

  // Update team mutation
  const updateTeamMutation = trpc.viewer.teams.update.useMutation({
    onSuccess: async (data) => {
      await utils.viewer.teams.get.invalidate({ teamId });
      await utils.viewer.teams.list.invalidate();
      triggerToast(t("your_team_updated_successfully"), "success");

      // Reset form with new data
      form.reset({
        id: team?.id || 0,
        name: data?.name || "",
        slug: data?.slug || "",
        bio: data?.bio || "",
        logo: data?.logoUrl || "",
      });
    },
    onError: (error) => {
      triggerToast(error.message, "error");
    },
  });

  // Disband team mutation
  const disbandTeamMutation = trpc.viewer.teams.delete.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.list.invalidate();
      triggerToast("Team profile updated successfully", "success");
      router.push("/teams");
    },
    onError: (error) => {
      triggerToast(error.message, "error");
    },
  });

  // Leave team mutation
  const leaveTeamMutation = trpc.viewer.teams.leave.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.list.invalidate();
      triggerToast("Team profile updated successfully", "success");
      router.push("/teams");
    },
    onError: (error) => {
      triggerToast(error.message, "error");
    },
  });

  // Initialize form with team data
  useEffect(() => {
    if (team) {
      form.reset({
        id: team.id,
        name: team.name || "",
        slug: team.slug || "",
        bio: team.bio || "",
        logo: team.logoUrl || "",
      });
    }
  }, [team, form]);

  // Handle team disbanding
  const disbandTeam = () => {
    if (!team) return;

    disbandTeamMutation.mutate({ teamId: team.id });
  };

  // Handle leaving team
  const leaveTeam = () => {
    if (!team) return;

    leaveTeamMutation.mutate({ teamId: team.id });
  };

  // Handle form submission
  const onSubmit = (data: TeamProfileFormData) => {
    if (!team) return;

    updateTeamMutation.mutate({
      id: team.id,
      name: data.name,
      slug: data.slug,
      bio: data.bio,
      logo: data.logo,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="mb-4 text-red-600">Failed to load team data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col space-y-4">
      <div className="border-subtle space-y-6 rounded-md border p-4">
        <Form {...form} onSubmit={onSubmit}>
          <div className="space-y-6">
            {/* Profile Picture */}
            <FormField
              control={form.control}
              name="logo"
              render={({ field: { value, onChange } }) => {
                const showRemoveLogoButton = !!value;

                return (
                  <div className="space-y-4">
                    <Label>{t("profile_picture")}</Label>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar
                          alt={form.getValues("name")}
                          data-testid="profile-upload-logo"
                          imageSrc={getPlaceholderAvatar(value, form.getValues("name"))}
                          size="lg"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex gap-2">
                          <CustomImageUploader
                            targetId="avatar-upload"
                            buttonText={t("upload_logo")}
                            onImageChange={onChange}
                            currentImageSrc={getPlaceholderAvatar(value, form.getValues("name"))}
                            targetType="logo"
                            buttonColor="secondary"
                            testIdentifier="logo"
                          />
                          {showRemoveLogoButton && (
                            <Button color="destructive" onClick={() => onChange(null)}>
                              {t("remove")}
                            </Button>
                          )}
                        </div>
                        <FormMessage className="text-sm text-red-600" />
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            {/* Team Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor="name">{t("team_name")}</Label>
                  <Input
                    id="name"
                    placeholder="Enter team name"
                    {...field}
                    className={form.formState.errors.name ? "border-red-500" : ""}
                  />
                  <FormMessage />
                </div>
              )}
            />

            {/* URL Slug */}
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor="slug">{t("team_url")}</Label>
                  <Input
                    id="slug"
                    placeholder="team-name"
                    {...field}
                    className={form.formState.errors.slug ? "border-red-500" : ""}
                  />
                  <FormMessage />
                </div>
              )}
            />

            {/* About */}
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>{t("bio")}</Label>
                  <Editor
                    getText={() => md.render(field.value || "")}
                    setText={(value: string) => field.onChange(turndown(value))}
                    excludedToolbarItems={["blockType"]}
                    disableLists
                    firstRender={firstRender}
                    setFirstRender={setFirstRender}
                    height="100px"
                    placeholder={t("team_description")}
                  />
                  <FormMessage />
                </div>
              )}
            />

            {/* Submit Button */}
            <Button
              color="primary"
              type="submit"
              loading={updateTeamMutation.isPending}
              disabled={isDisabled}>
              {t("update")}
            </Button>
          </div>
        </Form>
      </div>
      <div className="border-subtle rounded-md border p-4">
        <div className="mb-4">
          <Label className="text-destructive mb-0 text-base font-semibold">{t("danger_zone")}</Label>
          {team?.membership.role === "OWNER" && (
            <p className="text-subtle text-sm">{t("team_deletion_cannot_be_undone")}</p>
          )}
        </div>
        {team?.membership.role === "OWNER" ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button color="destructive" StartIcon="trash-2" data-testid="disband-team-button">
                {t("disband_team")}
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("disband_team")}</DialogTitle>
                <DialogDescription>{t("disband_team_confirmation_message")}</DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <Button color="secondary" onClick={() => setOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button
                  color="destructive"
                  onClick={() => {
                    disbandTeam();
                  }}>
                  {t("confirm_disband_team")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button color="destructive" StartIcon="log-out" data-testid="leave-team-button">
                {t("leave_team")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("leave_team")}</DialogTitle>
              </DialogHeader>
              <p>{t("leave_team_confirmation_message")}</p>
            </DialogContent>
            <DialogFooter>
              <Button color="secondary" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                color="destructive"
                onClick={() => {
                  leaveTeam();
                }}>
                {t("confirm_leave_team")}
              </Button>
            </DialogFooter>
          </Dialog>
        )}
      </div>
    </div>
  );
}
