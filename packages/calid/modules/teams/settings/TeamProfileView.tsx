"use client";

import { getDefaultAvatar } from "@calid/features/lib/defaultAvatar";
import { Avatar } from "@calid/features/ui/components/avatar";
import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@calid/features/ui/components/dialog";
import { Form, FormField } from "@calid/features/ui/components/form";
import { TextField } from "@calid/features/ui/components/input/input";
import { triggerToast } from "@calid/features/ui/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import turndown from "@calcom/lib/turndownService";
import { trpc } from "@calcom/trpc/react";
import { Editor } from "@calcom/ui/components/editor";
import { Label } from "@calcom/ui/components/form";
import { ImageUploader } from "@calcom/ui/components/image-uploader";

import SkeletonLoader from "../components/SkeletonLoader";

const regex = new RegExp("^[a-zA-Z0-9.-]*$");

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
      logo: null,
    },
  });

  const isDisabled = form.formState.isSubmitting || !form.formState.isDirty;

  const {
    data: team,
    isLoading,
    error,
  } = trpc.viewer.calidTeams.get.useQuery({ teamId }, { enabled: !!teamId });

  // Update team mutation
  const updateTeamMutation = trpc.viewer.calidTeams.update.useMutation({
    onSuccess: async (data) => {
      await utils.viewer.calidTeams.get.invalidate({ teamId });
      await utils.viewer.calidTeams.list.invalidate();
      triggerToast(t("team_settings_updated_successfully"), "success");

      // Reset form with new data
      form.reset({
        id: data?.id || 0,
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

  const disbandTeamMutation = trpc.viewer.calidTeams.delete.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.list.invalidate();
      triggerToast("team_disbanded_successfully", "success");
      router.push("/teams");
    },
    onError: (error) => {
      triggerToast(error.message, "error");
    },
  });

  const leaveTeamMutation = trpc.viewer.calidTeams.leaveTeam.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.list.invalidate();
      triggerToast("team_settings_updated_successfully", "success");
      router.push("/teams");
    },
    onError: (error) => {
      triggerToast(error.message, "error");
    },
  });

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

  const disbandTeam = () => {
    if (!team) return;
    disbandTeamMutation.mutate({ teamId: team.id });
  };

  const leaveTeam = () => {
    if (!team) return;
    leaveTeamMutation.mutate({ teamId: team.id });
  };

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
    return <SkeletonLoader />;
  }

  if (error || !team) {
    router.push("/teams");
  }

  return (
    <div className="flex w-full flex-col space-y-4">
      <div className="border-default space-y-6 rounded-md border p-4">
        <Form form={form} onSubmit={onSubmit}>
          <div className="space-y-6">
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
                          imageSrc={getDefaultAvatar(value, form.getValues("name"))}
                          size="lg"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex gap-2">
                          <ImageUploader
                            target="logo"
                            id="avatar-upload"
                            buttonMsg={t("upload_logo")}
                            handleAvatarChange={onChange}
                            triggerButtonColor={showRemoveLogoButton ? "secondary" : "primary"}
                            imageSrc={getDefaultAvatar(value, form.getValues("name"))}
                          />
                          {showRemoveLogoButton && (
                            <Button color="destructive" onClick={() => onChange(null)}>
                              {t("remove")}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <>
                  <TextField
                    name="name"
                    label={t("team_profile_team_name")}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <>
                  <TextField
                    name="slug"
                    label={t("team_profile_team_url")}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>{t("team_profile_bio")}</Label>
                  <Editor
                    getText={() => md.render(form.getValues("bio") || "")}
                    setText={(value: string) => {
                      form.setValue("bio", turndown(value), { shouldDirty: true });
                    }}
                    excludedToolbarItems={["blockType"]}
                    disableLists
                    firstRender={firstRender}
                    setFirstRender={setFirstRender}
                    height="100px"
                  />
                </div>
              )}
            />
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
      <div className="bg-cal-destructive-dim border-destructive rounded-md border p-4">
        <div className="mb-4">
          <Label className="text-destructive mb-0 text-base font-semibold">
            {t("team_profile_danger_zone")}
          </Label>
          {team?.membership.role === "OWNER" && (
            <p className="text-subtle text-sm">{t("action_cannot_be_undone")}</p>
          )}
        </div>
        {team?.membership.role === "OWNER" ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                color="destructive"
                variant="button"
                StartIcon="trash-2"
                className="bg-default text-destructive"
                data-testid="disband-team-button">
                {t("team_profile_disband_team")}
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("team_profile_disband_team")}</DialogTitle>
                <DialogDescription>{t("team_profile_disband_team_confirmation_message")}</DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <DialogClose />
                <Button
                  color="destructive"
                  variant="button"
                  onClick={() => {
                    disbandTeam();
                  }}>
                  {t("team_profile_confirm_disband_team")}
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
                <DialogTitle>{t("team_profile_leave_team")}</DialogTitle>
                <DialogDescription>{t("team_profile_leave_team_confirmation_message")}</DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <DialogClose />
                <Button
                  color="destructive"
                  variant="button"
                  onClick={() => {
                    leaveTeam();
                  }}>
                  {t("leave_team")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
