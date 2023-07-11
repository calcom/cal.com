import { zodResolver } from "@hookform/resolvers/zod";
import type { Prisma } from "@prisma/client";
import { LinkIcon, Trash2 } from "lucide-react";
import { useRouter } from "next/router";
import { useState, useLayoutEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { useOrgBrandingValues } from "@calcom/features/ee/organizations/hooks";
import { subdomainSuffix } from "@calcom/features/ee/organizations/lib/orgDomains";
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
  LinkIconButton,
} from "@calcom/ui";

import { getLayout } from "../../../../settings/layouts/SettingsLayout";

const orgProfileFormSchema = z.object({
  name: z.string(),
  logo: z.string(),
  bio: z.string(),
});

const OrgProfileView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();
  const [firstRender, setFirstRender] = useState(true);
  const orgBranding = useOrgBrandingValues();

  useLayoutEffect(() => {
    document.body.focus();
  }, []);

  const form = useForm({
    resolver: zodResolver(orgProfileFormSchema),
  });

  const mutation = trpc.viewer.organizations.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      showToast(t("your_organisation_updated_sucessfully"), "success");
    },
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

  const isBioEmpty =
    !currentOrganisation ||
    !currentOrganisation.bio ||
    !currentOrganisation.bio.replace("<p><br></p>", "").length;

  const deleteTeamMutation = trpc.viewer.teams.delete.useMutation({
    async onSuccess() {
      await utils.viewer.teams.list.invalidate();
      showToast(t("your_org_disbanded_successfully"), "success");
      router.push(`${WEBAPP_URL}/teams`);
    },
  });

  if (!orgBranding) return null;

  function deleteTeam() {
    if (currentOrganisation?.id) deleteTeamMutation.mutate({ teamId: currentOrganisation.id });
  }

  return (
    <LicenseRequired>
      <Meta title={t("profile")} description={t("profile_org_description")} />
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
                      label={t("org_name")}
                      value={value}
                      onChange={(e) => {
                        form.setValue("name", e?.target.value);
                      }}
                    />
                  </div>
                )}
              />
              <div className="mt-8">
                <TextField
                  name="slug"
                  label={t("org_url")}
                  value={currentOrganisation.slug ?? ""}
                  disabled
                  addOnSuffix={`.${subdomainSuffix()}`}
                />
              </div>
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
              <p className="text-default mt-2 text-sm">{t("org_description")}</p>
              <Button color="primary" className="mt-8" type="submit" loading={mutation.isLoading}>
                {t("update")}
              </Button>
            </Form>
          ) : (
            <div className="flex">
              <div className="flex-grow">
                <div>
                  <Label className="text-emphasis">{t("org_name")}</Label>
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
              <div className="">
                <LinkIconButton
                  Icon={LinkIcon}
                  onClick={() => {
                    navigator.clipboard.writeText(orgBranding.fullDomain);
                    showToast("Copied to clipboard", "success");
                  }}>
                  {t("copy_link_org")}
                </LinkIconButton>
              </div>
            </div>
          )}
          <hr className="border-subtle my-8 border" />

          <div className="text-default mb-3 text-base font-semibold">{t("danger_zone")}</div>
          {currentOrganisation?.user.role === "OWNER" ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button color="destructive" className="border" StartIcon={Trash2}>
                  {t("disband_org")}
                </Button>
              </DialogTrigger>
              <ConfirmationDialogContent
                variety="danger"
                title={t("disband_org")}
                confirmBtnText={t("confirm")}
                onConfirm={deleteTeam}>
                {t("disband_org_confirmation_message")}
              </ConfirmationDialogContent>
            </Dialog>
          ) : null}
          {/* LEAVE ORG should go above here ^ */}
        </>
      )}
    </LicenseRequired>
  );
};

OrgProfileView.getLayout = getLayout;

export default OrgProfileView;
