"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { getTeamUrlSync } from "@calcom/features/ee/organizations/lib/getTeamUrlSync";
import { trackFormbricksAction } from "@calcom/web/modules/formbricks/lib/trackFormbricksAction";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { md } from "@calcom/lib/markdownIt";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import objectKeys from "@calcom/lib/objectKeys";
import slugify from "@calcom/lib/slugify";
import turndown from "@calcom/lib/turndownService";
import type { Prisma } from "@calcom/prisma/client";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button, LinkIconButton } from "@calcom/ui/components/button";
import { DialogTrigger, ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { Editor } from "@calcom/ui/components/editor";
import { Form } from "@calcom/ui/components/form";
import { Label } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import {
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
  SkeletonAvatar,
} from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { revalidateTeamDataCache } from "@calcom/web/app/(booking-page-wrapper)/team/[slug]/[type]/actions";
import { revalidateEventTypesList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/event-types/actions";
import { revalidateTeamsList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/teams/actions";

const regex = new RegExp("^[a-zA-Z0-9-]*$");

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="border-subtle stack-y-6 rounded-b-xl border border-t-0 px-4 py-8">
        <div className="flex items-center">
          <SkeletonAvatar className="me-4 mt-0 h-16 w-16 px-4" />
          <SkeletonButton className="h-6 w-32 rounded-md p-5" />
        </div>
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />

        <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
      </div>
    </SkeletonContainer>
  );
};

const ProfileView = () => {
  const params = useParamsWithFallback();
  const teamId = Number(params.id);
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const session = useSession();

  useLayoutEffect(() => {
    document.body.focus();
  }, []);

  const {
    data: team,
    isPending,
    error,
  } = trpc.viewer.teams.get.useQuery(
    { teamId },
    {
      enabled: !!teamId,
    }
  );

  useEffect(
    function refactorMeWithoutEffect() {
      if (error) {
        router.replace("/teams");
      }
    },
    [error]
  );
  const isAdmin = team && checkAdminOrOwner(team.membership.role);

  const permalink = team
    ? `${getTeamUrlSync({
        orgSlug: team.parent ? team.parent.slug : null,
        teamSlug: team.slug,
      })}`
    : "";

  const isBioEmpty = !team || !team.bio || !team.bio.replace("<p><br></p>", "").length;

  const deleteTeamMutation = trpc.viewer.teams.delete.useMutation({
    async onSuccess() {
      revalidateTeamsList();
      await utils.viewer.teams.list.invalidate();
      await utils.viewer.eventTypes.getUserEventGroups.invalidate();
      revalidateEventTypesList();
      await utils.viewer.eventTypes.getByViewer.invalidate();
      showToast(t("your_team_disbanded_successfully"), "success");
      router.push(`${WEBAPP_URL}/teams`);
      trackFormbricksAction("team_disbanded");
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });

  const removeMemberMutation = trpc.viewer.teams.removeMember.useMutation({
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.teams.list.invalidate();
      revalidateTeamsList();
      await utils.viewer.eventTypes.invalidate();
      showToast(t("success"), "success");
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
        teamIds: [team.id],
        memberIds: [session.data.user.id],
      });
  }

  if (isPending) {
    return <SkeletonLoader />;
  }

  return (
    <>
      {isAdmin ? (
        <TeamProfileForm team={team} teamId={teamId} />
      ) : (
        <div className="border-subtle flex rounded-b-xl border border-t-0 px-4 py-8 sm:px-6">
          <div className="grow">
            <div>
              <Label className="text-emphasis">{t("team_name")}</Label>
              <p className="text-default text-sm">{team?.name}</p>
            </div>
            {team && !isBioEmpty && (
              <>
                <Label className="text-emphasis mt-5">{t("about")}</Label>
                {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized via markdownToSafeHTML */}
                <div
                  className="  text-subtle wrap-break-word text-sm [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
                  dangerouslySetInnerHTML={{ __html: markdownToSafeHTML(team.bio ?? null) }}
                />
              </>
            )}
          </div>
          <div>
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

      <div className="border-subtle mt-6 rounded-lg rounded-b-none border border-b-0 p-6">
        <Label className="mb-0 text-base font-semibold text-red-700">{t("danger_zone")}</Label>
        {team?.membership.role === "OWNER" && (
          <p className="text-subtle text-sm">{t("team_deletion_cannot_be_undone")}</p>
        )}
      </div>
      {team?.membership.role === "OWNER" ? (
        <Dialog>
          <SectionBottomActions align="end">
            <DialogTrigger asChild>
              <Button
                color="destructive"
                className="border"
                StartIcon="trash-2"
                data-testid="disband-team-button">
                {t("disband_team")}
              </Button>
            </DialogTrigger>
          </SectionBottomActions>
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
      ) : (
        <Dialog>
          <SectionBottomActions align="end">
            <DialogTrigger asChild>
              <Button color="destructive" className="border" StartIcon="log-out">
                {t("leave_team")}
              </Button>
            </DialogTrigger>
          </SectionBottomActions>
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
  );
};

export type TeamProfileFormProps = {
  team: RouterOutputs["viewer"]["teams"]["get"];
  teamId: number;
};

const TeamProfileForm = ({ team, teamId }: TeamProfileFormProps) => {
  const utils = trpc.useUtils();
  const { t } = useLocale();
  const router = useRouter();

  const teamProfileFormSchema = z.object({
    id: z.number(),
    name: z.string().trim().min(1, t("must_enter_team_name")),
    slug: z
      .string()
      .regex(regex, {
        message: "Url can only have alphanumeric characters(a-z, 0-9) and hyphen(-) symbol.",
      })
      .min(1, t("team_url_required")),
    logo: z.string().nullable(),
    bio: z.string(),
  });

  type FormValues = z.infer<typeof teamProfileFormSchema>;

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

  const defaultValues: FormValues = {
    id: team?.id,
    name: team?.name || "",
    logo: team?.logo || "",
    bio: team?.bio || "",
    slug: team?.slug || ((team?.metadata as Prisma.JsonObject)?.requestedSlug as string) || "",
  };

  const form = useForm({
    defaultValues,
    resolver: zodResolver(teamProfileFormSchema),
  });

  const [firstRender, setFirstRender] = useState(true);

  const {
    formState: { isSubmitting, isDirty },
    reset,
  } = form;

  const isDisabled = isSubmitting || !isDirty;

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

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(t("team_id_copied"), "success");
    } catch {
      showToast(t("error_copying_to_clipboard"), "error");
    }
  };
  return (
    <Form
      form={form}
      handleSubmit={(values) => {
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
      }}>
      <div className="border-subtle border-x px-4 py-8 sm:px-6">
        {!team.parent && (
          <div className="flex items-center pb-8">
            <Controller
              control={form.control}
              name="logo"
              render={({ field: { value, onChange } }) => {
                const showRemoveLogoButton = !!value;

                return (
                  <>
                    <Avatar
                      alt={form.getValues("name")}
                      data-testid="profile-upload-logo"
                      imageSrc={getPlaceholderAvatar(value, form.getValues("name"))}
                      size="lg"
                    />
                    <div className="ms-4 flex gap-2">
                      <ImageUploader
                        target="logo"
                        id="avatar-upload"
                        buttonMsg={t("upload_logo")}
                        handleAvatarChange={onChange}
                        triggerButtonColor={showRemoveLogoButton ? "secondary" : "primary"}
                        imageSrc={getPlaceholderAvatar(value, form.getValues("name"))}
                      />
                      {showRemoveLogoButton && (
                        <Button color="secondary" onClick={() => onChange(null)}>
                          {t("remove")}
                        </Button>
                      )}
                    </div>
                  </>
                );
              }}
            />
          </div>
        )}

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
                addOnLeading={`${getTeamUrlSync(
                  { orgSlug: team.parent ? team.parent.slug : null, teamSlug: null },
                  {
                    protocol: false,
                  }
                )}`}
                onChange={(e) => {
                  form.clearErrors("slug");
                  form.setValue("slug", slugify(e?.target.value, true), { shouldDirty: true });
                }}
              />
            </div>
          )}
        />

        <div className="mt-8">
          <TextField
            name="id"
            label={t("team_id")}
            value={teamId}
            disabled={true}
            addOnSuffix={
              <Tooltip content={t("copy_to_clipboard")}>
                <Button
                  color="minimal"
                  size="sm"
                  type="button"
                  aria-label="copy team id"
                  onClick={() => handleCopy(teamId.toString())}>
                  <Icon name="copy" className="ml-1 h-4 w-4" />
                </Button>
              </Tooltip>
            }
          />
        </div>
        <div className="mt-8">
          <Label>{t("about")}</Label>
          <Editor
            getText={() => md.render(form.getValues("bio") || "")}
            setText={(value: string) => form.setValue("bio", turndown(value), { shouldDirty: true })}
            excludedToolbarItems={["blockType"]}
            disableLists
            firstRender={firstRender}
            setFirstRender={setFirstRender}
            height="80px"
          />
        </div>
        <p className="text-default mt-2 text-sm">{t("team_description")}</p>
      </div>
      <SectionBottomActions align="end">
        <Button
          color="primary"
          type="submit"
          loading={mutation.isPending}
          disabled={isDisabled}
          data-testid="update-team-profile">
          {t("update")}
        </Button>
        {IS_TEAM_BILLING_ENABLED &&
          team.slug === null &&
          (team.metadata as Prisma.JsonObject)?.requestedSlug && (
            <Button
              color="secondary"
              className="ml-2"
              type="button"
              onClick={() => {
                publishMutation.mutate({ teamId: team.id });
              }}>
              {t("team_publish")}
            </Button>
          )}
      </SectionBottomActions>
    </Form>
  );
};

export default ProfileView;
