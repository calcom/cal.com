import { zodResolver } from "@hookform/resolvers/zod";
import type { Prisma } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, useLayoutEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import turndown from "@calcom/lib/turndownService";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import {
  Avatar,
  Button,
  ConfirmationDialogContent,
  Dialog,
  DialogTrigger,
  Form,
  ImageUploader,
  Label,
  Meta,
  showToast,
  TextField,
  Editor,
} from "@calcom/ui";
import { Trash2 } from "@calcom/ui/components/icon";

import { getLayout } from "../../../../settings/layouts/SettingsLayout";

const regex = new RegExp("^[a-zA-Z0-9-]*$");

const orgProfileFormSchema = z.object({
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

const OrgProfileView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();
  const session = useSession();
  const [firstRender, setFirstRender] = useState(true);

  useLayoutEffect(() => {
    document.body.focus();
  }, []);

  const mutation = trpc.viewer.organizations.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      showToast(t("your_organisation_updated_sucessfully"), "success");
    },
  });

  const form = useForm({
    resolver: zodResolver(orgProfileFormSchema),
  });

  const { data: currentOrganisation, isLoading } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {
    onError: () => {
      router.push("/settings");
    },
    onSuccess: (org) => {
      if (org) {
        form.setValue("name", org.name || "");
        form.setValue("slug", org.slug || "");
        form.setValue("logo", org.logo || "");
        form.setValue("bio", org.bio || "");
        if (org.slug === null && (org?.metadata as Prisma.JsonObject)?.requestedSlug) {
          form.setValue("slug", ((org?.metadata as Prisma.JsonObject)?.requestedSlug as string) || "");
        }
      }
    },
  });

  const isOrgAdminOrOwner =
    currentOrganisation &&
    (currentOrganisation.user.role === MembershipRole.OWNER ||
      currentOrganisation.user.role === MembershipRole.ADMIN);

  // const permalink = `${WEBAPP_URL}/team/${currentOrganisation?.slug}`;

  const isBioEmpty =
    !currentOrganisation ||
    !currentOrganisation.bio ||
    !currentOrganisation.bio.replace("<p><br></p>", "").length;

  const deleteTeamMutation = trpc.viewer.teams.delete.useMutation({
    async onSuccess() {
      await utils.viewer.teams.list.invalidate();
      showToast(t("your_team_disbanded_successfully"), "success");
      router.push(`${WEBAPP_URL}/teams`);
    },
  });

  function deleteTeam() {
    if (currentOrganisation?.id) deleteTeamMutation.mutate({ teamId: currentOrganisation.id });
  }

  return (
    <>
      <Meta title={t("profile")} description={t("profile_team_description")} />
      {!isLoading && (
        <>
          {isOrgAdminOrOwner ? (
            <Form
              form={form}
              handleSubmit={(values) => {
                if (currentOrganisation) {
                  const variables = {
                    logo: values.logo,
                    name: values.name,
                    slug: values.slug,
                    bio: values.bio,
                  };

                  mutation.mutate(variables);
                }
              }}>
              <div className="flex items-center">
                <Controller
                  control={form.control}
                  name="logo"
                  render={({ field: { value } }) => (
                    <>
                      <Avatar
                        alt=""
                        imageSrc={getPlaceholderAvatar(value, currentOrganisation?.name as string)}
                        size="lg"
                      />
                      <div className="ms-4">
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

              <hr className="border-subtle my-8" />

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
              {/* IDK how this is working in the current org implemntation @leo/@sean to touch up on this when public page url has been created */}

              {/* <Controller
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
              /> */}
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
              <Button color="primary" className="mt-8" type="submit" loading={mutation.isLoading}>
                {t("update")}
              </Button>
            </Form>
          ) : (
            <div className="flex">
              <div className="flex-grow">
                <div>
                  <Label className="text-emphasis">{t("team_name")}</Label>
                  <p className="text-default text-sm">{currentOrganisation?.name}</p>
                </div>
                {currentOrganisation && !isBioEmpty && (
                  <>
                    <Label className="text-emphasis mt-5">{t("about")}</Label>
                    <div
                      className="  text-subtle break-words text-sm [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
                      dangerouslySetInnerHTML={{ __html: md.render(currentOrganisation.bio || "") }}
                    />
                  </>
                )}
              </div>
              {/* IDK how this is working in the current org implemntation @leo/@sean to touch up on this when public page url has been created */}
              {/* <div className="">
                <Link href={permalink} passHref={true} target="_blank">
                  <LinkIconButton Icon={ExternalLink}>{t("preview")}</LinkIconButton>
                </Link>
                <LinkIconButton
                  Icon={LinkIcon}
                  onClick={() => {
                    navigator.clipboard.writeText(permalink);
                    showToast("Copied to clipboard", "success");
                  }}>
                  {t("copy_link_team")}
                </LinkIconButton>
              </div> */}
            </div>
          )}
          <hr className="border-subtle my-8 border" />

          <div className="text-default mb-3 text-base font-semibold">{t("danger_zone")}</div>
          {currentOrganisation?.user.role === "OWNER" ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button color="destructive" className="border" StartIcon={Trash2}>
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
          ) : null}
          {/* LEAVE ORG should go above here ^ */}
        </>
      )}
    </>
  );
};

OrgProfileView.getLayout = getLayout;

export default OrgProfileView;
