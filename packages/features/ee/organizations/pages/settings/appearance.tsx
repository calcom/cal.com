import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  ColorPicker,
  Form,
  Meta,
  showToast,
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
} from "@calcom/ui";

import ThemeLabel from "../../../../settings/ThemeLabel";
import { getLayout } from "../../../../settings/layouts/SettingsLayout";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} />
      <div className="mb-8 mt-6 space-y-6">
        <div className="flex items-center">
          <SkeletonButton className="mr-6 h-32 w-48 rounded-md p-5" />
          <SkeletonButton className="mr-6 h-32 w-48 rounded-md p-5" />
          <SkeletonButton className="mr-6 h-32 w-48 rounded-md p-5" />
        </div>
        <div className="flex justify-between">
          <SkeletonText className="h-8 w-1/3" />
          <SkeletonText className="h-8 w-1/3" />
        </div>

        <SkeletonText className="h-8 w-full" />

        <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
      </div>
    </SkeletonContainer>
  );
};

interface OrgAppearanceValues {
  hideBranding: boolean;
  hideBookATeamMember: boolean;
  brandColor: string;
  darkBrandColor: string;
  theme: string | null | undefined;
}

const OrgAppearanceView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();

  const mutation = trpc.viewer.organizations.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      showToast(t("your_team_updated_successfully"), "success");
    },
  });

  const { data: currentOrg, isLoading } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {
    onError: () => {
      router.push("/settings");
    },
  });

  const form = useForm<OrgAppearanceValues>({
    defaultValues: {
      theme: currentOrg?.theme,
      brandColor: currentOrg?.brandColor,
      darkBrandColor: currentOrg?.darkBrandColor,
      hideBranding: currentOrg?.hideBranding,
    },
  });

  const isAdmin =
    currentOrg &&
    (currentOrg.user.role === MembershipRole.OWNER || currentOrg.user.role === MembershipRole.ADMIN);

  if (isLoading) {
    return <SkeletonLoader title={t("booking_appearance")} description={t("appearance_team_description")} />;
  }
  return (
    <LicenseRequired>
      <Meta title={t("booking_appearance")} description={t("appearance_team_description")} />
      {isAdmin ? (
        <Form
          form={form}
          handleSubmit={(values) => {
            mutation.mutate({
              ...values,
              theme: values.theme || null,
            });
          }}>
          <div className="mb-6 flex items-center text-sm">
            <div>
              <p className="font-semibold">{t("theme")}</p>
              <p className="text-default">{t("theme_applies_note")}</p>
            </div>
          </div>
          <div className="flex flex-col justify-between sm:flex-row">
            <ThemeLabel
              variant="system"
              value={null}
              label={t("theme_system")}
              defaultChecked={currentOrg.theme === null}
              register={form.register}
            />
            <ThemeLabel
              variant="light"
              value="light"
              label={t("theme_light")}
              defaultChecked={currentOrg.theme === "light"}
              register={form.register}
            />
            <ThemeLabel
              variant="dark"
              value="dark"
              label={t("theme_dark")}
              defaultChecked={currentOrg.theme === "dark"}
              register={form.register}
            />
          </div>

          <hr className="border-subtle my-8" />
          <div className="text-default mb-6 flex items-center text-sm">
            <div>
              <p className="font-semibold">{t("custom_brand_colors")}</p>
              <p className="mt-0.5 leading-5">{t("customize_your_brand_colors")}</p>
            </div>
          </div>

          <div className="block justify-between sm:flex">
            <Controller
              name="brandColor"
              control={form.control}
              defaultValue={currentOrg.brandColor}
              render={() => (
                <div>
                  <p className="text-emphasis mb-2 block text-sm font-medium">{t("light_brand_color")}</p>
                  <ColorPicker
                    defaultValue={currentOrg.brandColor || "#292929"}
                    resetDefaultValue="#292929"
                    onChange={(value) => form.setValue("brandColor", value, { shouldDirty: true })}
                  />
                </div>
              )}
            />
            <Controller
              name="darkBrandColor"
              control={form.control}
              defaultValue={currentOrg.darkBrandColor}
              render={() => (
                <div className="mt-6 sm:mt-0">
                  <p className="text-emphasis mb-2 block text-sm font-medium">{t("dark_brand_color")}</p>
                  <ColorPicker
                    defaultValue={currentOrg.darkBrandColor || "#fafafa"}
                    resetDefaultValue="#fafafa"
                    onChange={(value) => form.setValue("darkBrandColor", value, { shouldDirty: true })}
                  />
                </div>
              )}
            />
          </div>
          <Button color="primary" className="mt-8" type="submit" loading={mutation.isLoading}>
            {t("update")}
          </Button>
        </Form>
      ) : (
        <div className="border-subtle rounded-md border p-5">
          <span className="text-default text-sm">{t("only_owner_change")}</span>
        </div>
      )}
    </LicenseRequired>
  );
};

OrgAppearanceView.getLayout = getLayout;

export default OrgAppearanceView;
