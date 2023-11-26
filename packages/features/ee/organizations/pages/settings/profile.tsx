import { zodResolver } from "@hookform/resolvers/zod";
import type { Prisma } from "@prisma/client";
import { LinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useLayoutEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { subdomainSuffix } from "@calcom/features/ee/organizations/lib/orgDomains";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import turndown from "@calcom/lib/turndownService";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import {
  Avatar,
  Button,
  Form,
  ImageUploader,
  Label,
  Meta,
  showToast,
  TextField,
  Editor,
  LinkIconButton,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
} from "@calcom/ui";

import { getLayout } from "../../../../settings/layouts/SettingsLayout";
import { useOrgBranding } from "../../../organizations/context/provider";

const orgProfileFormSchema = z.object({
  name: z.string(),
  logo: z.string().nullable(),
  bio: z.string(),
});

type FormValues = {
  name: string;
  logo: string | null;
  bio: string;
  slug: string;
};

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} borderInShellHeader={true} />
      <div className="border-subtle space-y-6 rounded-b-xl border border-t-0 px-4 py-8">
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

const OrgProfileView = () => {
  const { t } = useLocale();
  const router = useRouter();

  const orgBranding = useOrgBranding();

  useLayoutEffect(() => {
    document.body.focus();
  }, []);

  const { data: currentOrganisation, isLoading } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {
    onError: () => {
      router.push("/settings");
    },
  });

  if (isLoading || !orgBranding || !currentOrganisation) {
    return <SkeletonLoader title={t("profile")} description={t("profile_org_description")} />;
  }

  const isOrgAdminOrOwner =
    currentOrganisation.user.role === MembershipRole.OWNER ||
    currentOrganisation.user.role === MembershipRole.ADMIN;

  const isBioEmpty =
    !currentOrganisation ||
    !currentOrganisation.bio ||
    !currentOrganisation.bio.replace("<p><br></p>", "").length;

  const defaultValues: FormValues = {
    name: currentOrganisation?.name || "",
    logo: currentOrganisation?.logo || "",
    bio: currentOrganisation?.bio || "",
    slug:
      currentOrganisation?.slug ||
      ((currentOrganisation?.metadata as Prisma.JsonObject)?.requestedSlug as string) ||
      "",
  };

  return (
    <LicenseRequired>
      <Meta title={t("profile")} description={t("profile_org_description")} borderInShellHeader={true} />
      <>
        {isOrgAdminOrOwner ? (
          <OrgProfileForm defaultValues={defaultValues} />
        ) : (
          <div className="border-subtle flex rounded-b-md border border-t-0 px-4 py-8 sm:px-6">
            <div className="flex-grow">
              <div>
                <Label className="text-emphasis">{t("organization_name")}</Label>
                <p className="text-default text-sm">{currentOrganisation?.name}</p>
              </div>
              {!isBioEmpty && (
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
        {/* LEAVE ORG should go above here ^ */}
      </>
    </LicenseRequired>
  );
};

const OrgProfileForm = ({ defaultValues }: { defaultValues: FormValues }) => {
  const utils = trpc.useContext();
  const { t } = useLocale();
  const [firstRender, setFirstRender] = useState(true);

  const form = useForm({
    defaultValues,
    resolver: zodResolver(orgProfileFormSchema),
  });

  const mutation = trpc.viewer.organizations.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    onSuccess: async (res) => {
      reset({
        logo: (res.data?.logo || "") as string,
        name: (res.data?.name || "") as string,
        bio: (res.data?.bio || "") as string,
        slug: defaultValues["slug"],
      });
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.organizations.listCurrent.invalidate();
      showToast(t("your_organization_updated_sucessfully"), "success");
    },
  });

  const {
    formState: { isSubmitting, isDirty },
    reset,
  } = form;

  const isDisabled = isSubmitting || !isDirty;

  return (
    <Form
      form={form}
      handleSubmit={(values) => {
        const variables = {
          logo: values.logo,
          name: values.name,
          slug: values.slug,
          bio: values.bio,
        };

        mutation.mutate(variables);
      }}>
      <div className="border-subtle border-x px-4 py-8 sm:px-6">
        <div className="flex items-center">
          <Controller
            control={form.control}
            name="logo"
            render={({ field: { value } }) => {
              const showRemoveLogoButton = !!value;

              return (
                <>
                  <Avatar
                    alt={defaultValues.name || ""}
                    imageSrc={getPlaceholderAvatar(value, defaultValues.name as string)}
                    size="lg"
                  />
                  <div className="ms-4">
                    <div className="flex gap-2">
                      <ImageUploader
                        target="avatar"
                        id="avatar-upload"
                        buttonMsg={t("upload_logo")}
                        handleAvatarChange={(newLogo) => {
                          form.setValue("logo", newLogo, { shouldDirty: true });
                        }}
                        imageSrc={value || undefined}
                        triggerButtonColor={showRemoveLogoButton ? "secondary" : "primary"}
                      />
                      {showRemoveLogoButton && (
                        <Button
                          color="secondary"
                          onClick={() => {
                            form.setValue("logo", null, { shouldDirty: true });
                          }}>
                          {t("remove")}
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              );
            }}
          />
        </div>

        <Controller
          control={form.control}
          name="name"
          render={({ field: { value } }) => (
            <div className="mt-8">
              <TextField
                name="name"
                label={t("organization_name")}
                value={value}
                onChange={(e) => {
                  form.setValue("name", e?.target.value, { shouldDirty: true });
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
                label={t("organization_url")}
                value={value}
                disabled
                addOnSuffix={`.${subdomainSuffix()}`}
              />
            </div>
          )}
        />
        <div className="mt-8">
          <Label>{t("about")}</Label>
          <Editor
            getText={() => md.render(form.getValues("bio") || "")}
            setText={(value: string) => form.setValue("bio", turndown(value), { shouldDirty: true })}
            excludedToolbarItems={["blockType"]}
            disableLists
            firstRender={firstRender}
            setFirstRender={setFirstRender}
          />
        </div>
        <p className="text-default mt-2 text-sm">{t("org_description")}</p>
      </div>
      <SectionBottomActions align="end">
        <Button color="primary" type="submit" loading={mutation.isLoading} disabled={isDisabled}>
          {t("update")}
        </Button>
      </SectionBottomActions>
    </Form>
  );
};

OrgProfileView.getLayout = getLayout;

export default OrgProfileView;
