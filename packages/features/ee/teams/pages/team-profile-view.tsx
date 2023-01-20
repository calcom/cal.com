import { zodResolver } from "@hookform/resolvers/zod";
import { MembershipRole, Prisma } from "@prisma/client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { CAL_URL } from "@calcom/lib/constants";
import { IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/getPlaceholderAvatar";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import objectKeys from "@calcom/lib/objectKeys";
import { trpc } from "@calcom/trpc/react";
import {
  Avatar,
  Button,
  ConfirmationDialogContent,
  Dialog,
  DialogTrigger,
  Form,
  Icon,
  ImageUploader,
  Label,
  LinkIconButton,
  Meta,
  showToast,
  TextArea,
  TextField,
} from "@calcom/ui";

import { getLayout } from "../../../settings/layouts/SettingsLayout";

const regex = new RegExp("^[a-zA-Z0-9-]*$");

const teamProfileFormSchema = z.object({
  name: z.string(),
  slug: z
    .string()
    .regex(regex, {
      message: "Url can only have alphanumeric characters(a-z, 0-9) and hyphen(-) symbol.",
    })
    .min(1, { message: "Url cannot be left empty" }),
  logo: z.string(),
  bio: z.string(),
});

const ProfileView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();
  const session = useSession();

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      showToast(t("your_team_updated_successfully"), "success");
    },
  });

  const form = useForm({
    resolver: zodResolver(teamProfileFormSchema),
  });

  const { data: team, isLoading } = trpc.viewer.teams.get.useQuery(
    { teamId: Number(router.query.id) },
    {
      onError: () => {
        router.push("/settings");
      },
      onSuccess: (team) => {
        if (team) {
          form.setValue("name", team.name || "");
          form.setValue("slug", team.slug || "");
          form.setValue("logo", team.logo || "");
          form.setValue("bio", team.bio || "");
          if (team.slug === null && (team?.metadata as Prisma.JsonObject)?.requestedSlug) {
            form.setValue("slug", ((team?.metadata as Prisma.JsonObject)?.requestedSlug as string) || "");
          }
        }
      },
    }
  );

  const isAdmin =
    team && (team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN);

  const permalink = `${CAL_URL?.replace(/^(https?:|)\/\//, "")}/team/${team?.slug}`;

  const deleteTeamMutation = trpc.viewer.teams.delete.useMutation({
    async onSuccess() {
      await utils.viewer.teams.list.invalidate();
      showToast(t("your_team_disbanded_successfully"), "success");
      router.push(`${WEBAPP_URL}/teams`);
    },
  });

  const removeMemberMutation = trpc.viewer.teams.removeMember.useMutation({
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.teams.list.invalidate();
      showToast(t("success"), "success");
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });

  const publishMutation = trpc.viewer.teams.publish.useMutation({
    async onSuccess(data: { url?: string }) {
      if (data.url) {
        router.push(data.url);
      }
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });

  function deleteTeam() {
    if (team?.id) deleteTeamMutation.mutate({ teamId: team.id });
  }

  function leaveTeam() {
    if (team?.id && session.data)
      removeMemberMutation.mutate({
        teamId: team.id,
        memberId: session.data.user.id,
      });
  }

  return (
    <>
      <Meta title={t("profile")} description={t("profile_team_description")} />
      {!isLoading && (
        <>
          {isAdmin ? (
            <Form
              form={form}
              handleSubmit={(values) => {
                if (team) {
                  const variables = {
                    logo: values.logo,
                    name: values.name,
                    slug: values.slug,
                    bio: values.bio,
                  };
                  objectKeys(variables).forEach((key) => {
                    if (variables[key as keyof typeof variables] === team?.[key]) delete variables[key];
                  });
                  mutation.mutate({ id: team.id, ...variables });
                }
              }}>
              <div className="flex items-center">
                <Controller
                  control={form.control}
                  name="logo"
                  render={({ field: { value } }) => (
                    <>
                      <Avatar alt="" imageSrc={getPlaceholderAvatar(value, team?.name as string)} size="lg" />
                      <div className="ltr:ml-4 rtl:mr-4">
                        <ImageUploader
                          target="avatar"
                          id="avatar-upload"
                          buttonMsg={t("update")}
                          handleAvatarChange={(newLogo) => {
                            form.setValue("logo", newLogo);
                          }}
                          imageSrc={value}
                        />
                      </div>
                    </>
                  )}
                />
              </div>

              <hr className="my-8 border-gray-200" />

              <Controller
                control={form.control}
                name="name"
                render={({ field: { value } }) => (
                  <div className="mt-8">
                    <TextField
                      name="name"
                      label={t("team_name")}
                      value={value}
                      onChange={(e) => {
                        form.setValue("name", e?.target.value);
                      }}
                    />
                  </div>
                )}
              />
              <Controller
                control={form.control}
                name="slug"
                render={({ field: { value } }) => (
                  <div className="mt-8">
                    <TextField
                      name="slug"
                      label={t("team_url")}
                      value={value}
                      addOnLeading={`${WEBAPP_URL}/team/`}
                      onChange={(e) => {
                        form.clearErrors("slug");
                        form.setValue("slug", e?.target.value);
                      }}
                    />
                  </div>
                )}
              />
              <Controller
                control={form.control}
                name="bio"
                render={({ field: { value } }) => (
                  <div className="mt-8">
                    <Label>{t("about")}</Label>
                    <TextArea
                      name="bio"
                      value={value}
                      className="h-14"
                      onChange={(e) => {
                        form.setValue("bio", e?.target.value);
                      }}
                    />
                  </div>
                )}
              />
              <p className="mt-2 text-sm text-gray-600">{t("team_description")}</p>
              <Button color="primary" className="mt-8" type="submit" loading={mutation.isLoading}>
                {t("update")}
              </Button>
              {IS_TEAM_BILLING_ENABLED &&
                team.slug === null &&
                (team.metadata as Prisma.JsonObject)?.requestedSlug && (
                  <Button
                    color="secondary"
                    className="ml-2 mt-8"
                    type="button"
                    onClick={() => {
                      publishMutation.mutate({ teamId: team.id });
                    }}>
                    Publish
                  </Button>
                )}
            </Form>
          ) : (
            <div className="flex">
              <div className="flex-grow">
                <div>
                  <Label className="text-black">{t("team_name")}</Label>
                  <p className="text-sm text-gray-800">{team?.name}</p>
                </div>
                {team?.bio && (
                  <>
                    <Label className="mt-5 text-black">{t("about")}</Label>
                    <p className="text-sm text-gray-800">{team.bio}</p>
                  </>
                )}
              </div>
              <div className="">
                <Link href={permalink} passHref={true} target="_blank">
                  <LinkIconButton Icon={Icon.FiExternalLink}>{t("preview")}</LinkIconButton>
                </Link>
                <LinkIconButton
                  Icon={Icon.FiLink}
                  onClick={() => {
                    navigator.clipboard.writeText(permalink);
                    showToast("Copied to clipboard", "success");
                  }}>
                  {t("copy_link_team")}
                </LinkIconButton>
              </div>
            </div>
          )}
          <hr className="border-1 my-8 border-gray-200" />

          <div className="mb-3 text-base font-semibold">{t("danger_zone")}</div>
          {team?.membership.role === "OWNER" ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button color="destructive" className="border" StartIcon={Icon.FiTrash2}>
                  {t("disband_team")}
                </Button>
              </DialogTrigger>
              <ConfirmationDialogContent
                variety="danger"
                title={t("disband_team")}
                confirmBtnText={t("confirm_disband_team")}
                onConfirm={deleteTeam}>
                {t("disband_team_confirmation_message")}
              </ConfirmationDialogContent>
            </Dialog>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <Button color="destructive" className="border" StartIcon={Icon.FiLogOut}>
                  {t("leave_team")}
                </Button>
              </DialogTrigger>
              <ConfirmationDialogContent
                variety="danger"
                title={t("leave_team")}
                confirmBtnText={t("confirm_leave_team")}
                onConfirm={leaveTeam}>
                {t("leave_team_confirmation_message")}
              </ConfirmationDialogContent>
            </Dialog>
          )}
        </>
      )}
    </>
  );
};

ProfileView.getLayout = getLayout;

export default ProfileView;
