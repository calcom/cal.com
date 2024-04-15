"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Prisma } from "@prisma/client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { trackFormbricksAction } from "@calcom/lib/formbricks-client";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { md } from "@calcom/lib/markdownIt";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import objectKeys from "@calcom/lib/objectKeys";
import slugify from "@calcom/lib/slugify";
import turndown from "@calcom/lib/turndownService";
import { trpc } from "@calcom/trpc/react";
import {
  Avatar,
  Button,
  ConfirmationDialogContent,
  Dialog,
  DialogTrigger,
  Editor,
  Form,
  ImageUploader,
  Label,
  LinkIconButton,
  Meta,
  showToast,
  SkeletonContainer,
  SkeletonText,
  TextField,
} from "@calcom/ui";

import { getLayout } from "../../../../settings/layouts/SettingsLayout";
import { subdomainSuffix } from "../../../organizations/lib/orgDomains";

const regex = new RegExp("^[a-zA-Z0-9-]*$");

const teamProfileFormSchema = z.object({
  name: z.string(),
  slug: z
    .string()
    .regex(regex, {
      message: "Url can only have alphanumeric characters(a-z, 0-9) and hyphen(-) symbol.",
    })
    .min(1, { message: "Url cannot be left empty" }),
  logoUrl: z.string().nullable(),
  bio: z.string(),
});

const OtherTeamProfileView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const session = useSession();
  const [firstRender, setFirstRender] = useState(true);

  useLayoutEffect(() => {
    document.body.focus();
  }, []);

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
  const params = useParamsWithFallback();
  const teamId = Number(params.id);
  const {
    data: team,
    isPending,
    error: teamError,
  } = trpc.viewer.organizations.getOtherTeam.useQuery(
    { teamId: teamId },
    {
      enabled: !Number.isNaN(teamId),
    }
  );
  useEffect(
    function refactorMeWithoutEffect() {
      if (teamError) {
        router.push("/settings");
      }
    },
    [teamError]
  );

  useEffect(
    function refactorMeWithoutEffect() {
      if (team) {
        form.setValue("name", team.name || "");
        form.setValue("slug", team.slug || "");
        form.setValue("logoUrl", team.logoUrl);
        form.setValue("bio", team.bio || "");
        if (team.slug === null && (team?.metadata as Prisma.JsonObject)?.requestedSlug) {
          form.setValue("slug", ((team?.metadata as Prisma.JsonObject)?.requestedSlug as string) || "");
        }
      }
    },
    [team]
  );

  // This page can only be accessed by team admins (owner/admin)
  const isAdmin = true;

  const permalink = `${WEBAPP_URL}/team/${team?.slug}`;

  const isBioEmpty = !team || !team.bio || !team.bio.replace("<p><br></p>", "").length;

  const deleteTeamMutation = trpc.viewer.organizations.deleteTeam.useMutation({
    async onSuccess() {
      await utils.viewer.organizations.listOtherTeams.invalidate();
      showToast(t("your_team_disbanded_successfully"), "success");
      router.push(`${WEBAPP_URL}/teams`);
      trackFormbricksAction("team_disbanded");
    },
  });

  const removeMemberMutation = trpc.viewer.teams.removeMember.useMutation({
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.teams.list.invalidate();
      await utils.viewer.eventTypes.invalidate();
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

  if (!team) return null;

  return (
    <>
      <Meta title={t("profile")} description={t("profile_team_description")} />
      {!isPending ? (
        <>
          {isAdmin ? (
            <Form
              form={form}
              handleSubmit={(values) => {
                if (team) {
                  const variables = {
                    logoUrl: values.logoUrl,
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
                  name="logoUrl"
                  render={({ field: { value, onChange } }) => (
                    <>
                      <Avatar alt="" imageSrc={getPlaceholderAvatar(value, team?.name)} size="lg" />
                      <div className="ms-4">
                        <ImageUploader
                          target="logo"
                          id="avatar-upload"
                          buttonMsg={t("update")}
                          handleAvatarChange={onChange}
                          imageSrc={value}
                        />
                      </div>
                    </>
                  )}
                />
              </div>

              <hr className="border-subtle my-8" />

              <Controller
                control={form.control}
                name="name"
                render={({ field: { value, onChange } }) => (
                  <div className="mt-8">
                    <TextField
                      name="name"
                      label={t("team_name")}
                      value={value}
                      onChange={(e) => onChange(e?.target.value)}
                    />
                  </div>
                )}
              />
              <Controller
                control={form.control}
                name="slug"
                render={({ field: { value, onChange } }) => (
                  <div className="mt-8">
                    <TextField
                      name="slug"
                      label={t("team_url")}
                      value={value}
                      addOnLeading={
                        team?.parent ? `${team.parent.slug}.${subdomainSuffix()}/` : `${WEBAPP_URL}/team/`
                      }
                      onChange={(e) => {
                        form.clearErrors("slug");
                        onChange(slugify(e?.target.value, true));
                      }}
                    />
                  </div>
                )}
              />
              <div className="mt-8">
                <Label>{t("about")}</Label>
                <Editor
                  getText={() => md.render(form.getValues("bio") || "")}
                  setText={(value: string) => form.setValue("bio", turndown(value))}
                  excludedToolbarItems={["blockType"]}
                  disableLists
                  firstRender={firstRender}
                  setFirstRender={setFirstRender}
                />
              </div>
              <p className="text-default mt-2 text-sm">{t("team_description")}</p>
              <Button color="primary" className="mt-8" type="submit" loading={mutation.isPending}>
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
                  <Label className="text-emphasis">{t("team_name")}</Label>
                  <p className="text-default text-sm">{team?.name}</p>
                </div>
                {team && !isBioEmpty && (
                  <>
                    <Label className="text-emphasis mt-5">{t("about")}</Label>
                    <div
                      className="  text-subtle break-words text-sm [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
                      dangerouslySetInnerHTML={{ __html: md.render(markdownToSafeHTML(team.bio)) }}
                    />
                  </>
                )}
              </div>
              <div className="">
                <Link href={permalink} passHref={true} target="_blank">
                  <LinkIconButton Icon="external-link">{t("preview")}</LinkIconButton>
                </Link>
                <LinkIconButton
                  Icon="link"
                  onClick={() => {
                    navigator.clipboard.writeText(permalink);
                    showToast("Copied to clipboard", "success");
                  }}>
                  {t("copy_link_team")}
                </LinkIconButton>
              </div>
            </div>
          )}
          <hr className="border-subtle my-8 border" />

          <div className="text-default mb-3 text-base font-semibold">{t("danger_zone")}</div>

          <Dialog>
            <DialogTrigger asChild>
              <Button color="destructive" className="border" StartIcon="trash-2">
                {t("disband_team")}
              </Button>
            </DialogTrigger>
            <ConfirmationDialogContent
              variety="danger"
              title={t("disband_team")}
              confirmBtnText={t("confirm_disband_team")}
              onConfirm={() => {
                deleteTeam();
              }}>
              {t("disband_team_confirmation_message")}
            </ConfirmationDialogContent>
          </Dialog>
        </>
      ) : (
        <>
          <SkeletonContainer as="form">
            <div className="flex items-center">
              <div className="ms-4">
                <SkeletonContainer>
                  <div className="bg-emphasis h-16 w-16 rounded-full" />
                </SkeletonContainer>
              </div>
            </div>
            <hr className="border-subtle my-8" />
            <SkeletonContainer>
              <div className="mt-8">
                <SkeletonText className="h-6 w-48" />
              </div>
            </SkeletonContainer>
            <SkeletonContainer>
              <div className="mt-8">
                <SkeletonText className="h-6 w-48" />
              </div>
            </SkeletonContainer>
            <div className="mt-8">
              <SkeletonContainer>
                <div className="bg-emphasis h-24 rounded-md" />
              </SkeletonContainer>
              <SkeletonText className="mt-4 h-12 w-32" />
            </div>
            <SkeletonContainer>
              <div className="mt-8">
                <SkeletonText className="h-9 w-24" />
              </div>
            </SkeletonContainer>
          </SkeletonContainer>
        </>
      )}
    </>
  );
};

OtherTeamProfileView.getLayout = getLayout;

export default OtherTeamProfileView;
