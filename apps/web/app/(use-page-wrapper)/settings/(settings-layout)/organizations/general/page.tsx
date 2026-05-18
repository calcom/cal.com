"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import slugify from "@calcom/lib/slugify";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Form, TextAreaField, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

type OrganizationGeneralFormValues = {
  name: string;
  slug: string;
  bio: string;
};

export default function OrganizationGeneralPage() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { data: organization, isLoading } = trpc.viewer.organizations.getCurrent.useQuery();

  const form = useForm<OrganizationGeneralFormValues>({
    defaultValues: {
      name: "",
      slug: "",
      bio: "",
    },
  });

  const {
    formState: { isDirty, isSubmitting },
    reset,
    watch,
    setValue,
  } = form;

  useEffect(() => {
    if (!organization) return;

    reset({
      name: organization.name,
      slug: organization.slug || "",
      bio: organization.bio || "",
    });
  }, [organization, reset]);

  const createMutation = trpc.viewer.organizations.create.useMutation({
    onSuccess: async (createdOrganization) => {
      await utils.viewer.organizations.getCurrent.invalidate();
      await utils.viewer.me.get.invalidate();
      reset({
        name: createdOrganization.name,
        slug: createdOrganization.slug || "",
        bio: createdOrganization.bio || "",
      });
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const updateMutation = trpc.viewer.organizations.update.useMutation({
    onSuccess: async (updatedOrganization) => {
      await utils.viewer.organizations.getCurrent.invalidate();
      await utils.viewer.me.get.invalidate();
      reset({
        name: updatedOrganization.name,
        slug: updatedOrganization.slug || "",
        bio: updatedOrganization.bio || "",
      });
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const watchedName = watch("name");
  const canUpdate = !organization || organization.canUpdate;
  const isSaving = createMutation.isPending || updateMutation.isPending || isSubmitting;
  const isSubmitDisabled = isLoading || isSaving || !canUpdate || (!!organization && !isDirty);

  return (
    <SettingsHeader
      title={t("general")}
      description={organization ? t("organization_general_description") : t("organizations_description")}
      borderInShellHeader={true}>
      <Form
        form={form}
        handleSubmit={async (values) => {
          const payload = {
            name: values.name,
            slug: slugify(values.slug || values.name).toLowerCase(),
            bio: values.bio || null,
          };

          if (organization) {
            await updateMutation.mutateAsync(payload);
          } else {
            await createMutation.mutateAsync(payload);
          }
        }}>
        <div className="border-subtle space-y-6 border-x border-y-0 px-4 py-8 sm:px-6">
          <TextField
            {...form.register("name", { required: true })}
            data-testid="org-name-input"
            label={t("organization_name")}
            placeholder={t("organization_name")}
            disabled={!canUpdate || isLoading}
            required
          />

          <TextField
            data-testid="org-slug-input"
            {...form.register("slug", {
              required: true,
              onChange: (event) => {
                setValue("slug", slugify(event.target.value).toLowerCase(), {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              },
            })}
            label={t("organization_url")}
            placeholder={slugify(watchedName || "acme").toLowerCase()}
            disabled={!canUpdate || isLoading}
            required
          />

          <TextAreaField
            {...form.register("bio")}
            label={t("organization_about_description")}
            placeholder={t("organization_about_description")}
            disabled={!canUpdate || isLoading}
            rows={4}
          />

          {!canUpdate && (
            <p className="text-sm text-subtle">Only organization owners and admins can update these settings.</p>
          )}
        </div>
        <SectionBottomActions align="end">
          <Button data-testid="org-submit-btn" type="submit" loading={isSaving} disabled={isSubmitDisabled}>
            {organization ? t("save") : t("create_org")}
          </Button>
        </SectionBottomActions>
      </Form>
    </SettingsHeader>
  );
}
