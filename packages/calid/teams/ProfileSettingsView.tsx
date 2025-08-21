"use client";

import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  Textarea,
  TextField,
  Button,
  Avatar,
} from "@calid/features/ui";

// import { TextField } from "@calcom/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Prisma } from "@prisma/client";
import { useEffect, useLayoutEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { getTeamUrlSync } from "@calcom/lib/getBookerUrl/client";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import objectKeys from "@calcom/lib/objectKeys";
import slugify from "@calcom/lib/slugify";
import { trpc } from "@calcom/trpc/react";
import { Form } from "@calcom/ui/components/form";
import { BannerUploader, ImageUploader } from "@calcom/ui/components/image-uploader";
import { showToast } from "@calcom/ui/components/toast";
import { revalidateTeamDataCache } from "@calcom/web/app/(booking-page-wrapper)/team/[slug]/[type]/actions";
import { revalidateEventTypesList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/event-types/actions";
import { revalidateTeamsList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/teams/actions";

const regex = new RegExp("^[a-zA-Z0-9-]*$");

const profileFormSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z
    .string()
    .regex(regex, {
      message: "Url can only have alphanumeric characters(a-z, 0-9) and hyphen(-) symbol.",
    })
    .min(1, { message: "Url cannot be left empty" }),
  logo: z.string().nullable(),
  bio: z.string(),
});

type FormValues = z.infer<typeof profileFormSchema>;

export default function ProfileSettingsView({ teamId }: { teamId: string }) {
  const { t } = useLocale();

  const {
    data: team,
    isPending,
    error,
  } = trpc.viewer.teams.get.useQuery(
    { teamId: Number(teamId) },
    {
      enabled: !!teamId,
    }
  );

  function deleteTeam() {
    if (team?.id) deleteTeamMutation.mutate({ teamId: team.id });
  }

  function leaveTeam() {
    if (team?.id && session.data)
      removeMemberMutation.mutate({
        teamIds: [team.id],
        memberIds: [session.data.user.id],
      });
  }

  return (
    <div>
      <ProfileSettingsForm team={team} />

      <div className="bg-cal-destructive-dim border-destructive mb-2 mt-6 rounded-lg border p-6">
        <Label className="text-destructive mb-1 text-base font-semibold">{t("danger_zone")}</Label>
        <p className="text-subtle mb-1 text-sm">{t("account_deletion_cannot_be_undone")}</p>

        {team?.membership.role === "OWNER" ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                color="destructive_account"
                className="border"
                StartIcon="trash-2"
                data-testid="disband-team-button">
                {t("disband_team")}
              </Button>
            </DialogTrigger>
            <DialogContent variety="danger">
              <DialogTitle>{t("disband_team")}</DialogTitle>
              <DialogDescription>{t("disband_team_confirmation_message")}</DialogDescription>
              <DialogFooter>
                <Button
                  data-testid="rejection-confirm"
                  onClick={() => {
                    deleteTeam();
                  }}>
                  {t("confirm_disband_team")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Dialog>
            <DialogTrigger asChild>
              <Button color="destructive_account" className="border" StartIcon="log-out">
                {t("leave_team")}
              </Button>
            </DialogTrigger>
            {/* <DialogContent variety="danger">{t("leave_team_confirmation_message")}</DialogContent> */}
            <DialogContent variety="danger">
              <DialogTitle>{t("leave_team")}</DialogTitle>
              <DialogDescription>{t("confirm_leave_team")}</DialogDescription>
              <DialogFooter>
                <Button data-testid="rejection-confirm" onClick={leaveTeam}>
                  {t("confirm_disband_team")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

function ProfileSettingsForm({ team }: { team }) {
  const { t } = useLocale();

  console.log("Team: ", team);

  const defaultValues: FormValues = {
    id: team?.id,
    name: team?.name || "",
    logo: team?.logo || "",
    bio: team?.bio || "",
    slug: team?.slug || ((team?.metadata as Prisma.JsonObject)?.requestedSlug as string) || "",
  };

  console.log("Default Values: ", defaultValues);

  const form = useForm({
    defaultValues,
    resolver: zodResolver(profileFormSchema),
  });

  console.log("Form object:", form);
  console.log("Form handleSubmit:", typeof form.handleSubmit);

  const utils = trpc.useUtils();

  const {
    formState: { isSubmitting, isDirty },
    reset,
  } = form;

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess(res) {
      reset({
        logo: res?.logoUrl,
        name: (res?.name || "") as string,
        bio: (res?.bio || "") as string,
        slug: res?.slug as string,
      });
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.eventTypes.getUserEventGroups.invalidate();
      revalidateEventTypesList();
      // TODO: Not all changes require list invalidation
      await utils.viewer.teams.list.invalidate();
      revalidateTeamsList();

      if (res?.slug) {
        await revalidateTeamDataCache({
          teamSlug: res.slug,
          orgSlug: team?.parent?.slug ?? null,
        });
      }

      showToast(t("your_team_updated_successfully"), "success");
    },
  });

  const onSubmit = (values) => {
    console.log("updating: ", team);
    if (team) {
      const variables = {
        name: values.name,
        slug: values.slug,
        bio: values.bio,
        logo: values.logo,
      };
      objectKeys(variables).forEach((key) => {
        if (variables[key as keyof typeof variables] === team?.[key]) delete variables[key];
      });
      mutation.mutate({ id: team.id, ...variables });
    }
  };

  return (
    <Form form={form} handleSubmit={onSubmit}>
      <div className="border-subtle flex flex-col rounded-md border p-6">
        <div className="font-medium">{t("profile_picture")}</div>
        <Controller
          control={form.control}
          name="logo"
          render={({ field: { value, onChange } }) => {
            const showRemoveLogoButton = value !== null;
            return (
              <div className="flex flex-row items-center gap-2">
                <Avatar
                  data-testid="profile-upload-logo"
                  alt={form.getValues("name")}
                  imageSrc={getPlaceholderAvatar(value, form.getValues("name"))}
                  size="lg"
                />
                <div className="flex gap-2">
                  <ImageUploader
                    target="logo"
                    id="avatar-upload"
                    buttonMsg={t("upload_logo")}
                    handleAvatarChange={onChange}
                    imageSrc={getPlaceholderAvatar(value, form.getValues("name"))}
                    triggerButtonColor={showRemoveLogoButton ? "secondary" : "primary"}
                  />
                  {showRemoveLogoButton && (
                    <Button color="secondary" onClick={() => onChange(null)}>
                      {t("remove")}
                    </Button>
                  )}
                </div>
              </div>
            );
          }}
        />

        <div className="mt-8">
          <Controller
            control={form.control}
            name="name"
            render={({ field: { name, value, onChange } }) => (
              <TextField
                name={name}
                label={t("team_name")}
                value={value}
                onChange={(e) => onChange(e?.target.value)}
              />
            )}
          />
        </div>

        <Controller
          control={form.control}
          name="slug"
          render={({ field: { value } }) => (
            <div className="mt-8">
              <TextField
                name="slug"
                label={t("team_url")}
                value={value}
                data-testid="team-url"
                addOnClassname="testid-leading-text-team-url"
                inputPrefixWidget={
                  <div className="bg-muted flex rounded-l-md p-2.5 text-sm">
                    {getTeamUrlSync(
                      { orgSlug: team?.parent ? team?.parent.slug : null, teamSlug: null },
                      {
                        protocol: false,
                      }
                    )}
                  </div>
                }
                onChange={(e) => {
                  form.clearErrors("slug");
                  form.setValue("slug", slugify(e?.target.value, true), { shouldDirty: true });
                }}
              />
            </div>
          )}
        />
        <Label className="mb-2 mt-8">{t("bio")}</Label>

        <Controller
          control={form.control}
          name="bio"
          render={({ field: { value, onChange } }) => (
            <Textarea name="bio" rows={3} value={value} onChange={onChange} />
          )}
        />
      </div>

      <Button
        className="mt-6 flex w-[120px]"
        data-testid="save-profile"
        color="primary"
        type="submit"
        loading={mutation.isPending}>
        {t("save_changes")}
      </Button>
    </Form>
  );
}
