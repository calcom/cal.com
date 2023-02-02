import { MembershipRole } from "@prisma/client";
import { useRouter } from "next/router";
import { Controller, useForm } from "react-hook-form";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
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
  Switch,
} from "@calcom/ui";

import ThemeLabel from "../../../settings/ThemeLabel";
import { getLayout } from "../../../settings/layouts/SettingsLayout";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} />
      <div className="mt-6 mb-8 space-y-6 divide-y">
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

interface TeamAppearanceValues {
  hideBranding: boolean;
  hideBookATeamMember: boolean;
  brandColor: string;
  darkBrandColor: string;
  theme: string | null | undefined;
}

const ProfileView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      showToast(t("your_team_updated_successfully"), "success");
    },
  });

  const { data: team, isLoading } = trpc.viewer.teams.get.useQuery(
    { teamId: Number(router.query.id) },
    {
      onError: () => {
        router.push("/settings");
      },
    }
  );

  const form = useForm<TeamAppearanceValues>({
    defaultValues: {
      theme: team?.theme,
      brandColor: team?.brandColor,
      darkBrandColor: team?.darkBrandColor,
      hideBranding: team?.hideBranding,
    },
  });

  const isAdmin =
    team && (team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN);

  if (isLoading) {
    return <SkeletonLoader title={t("booking_appearance")} description={t("appearance_team_description")} />;
  }
  return (
    <>
      <Meta title={t("booking_appearance")} description={t("appearance_team_description")} />
      {isAdmin ? (
        <Form
          form={form}
          handleSubmit={(values) => {
            mutation.mutate({
              id: team.id,
              ...values,
              theme: values.theme || null,
            });
          }}>
          <div className="mb-6 flex items-center text-sm">
            <div>
              <p className="font-semibold">{t("theme")}</p>
              <p className="text-gray-600">{t("theme_applies_note")}</p>
            </div>
          </div>
          <div className="flex flex-col justify-between sm:flex-row">
            <ThemeLabel
              variant="system"
              value={null}
              label={t("theme_system")}
              defaultChecked={team.theme === null}
              register={form.register}
            />
            <ThemeLabel
              variant="light"
              value="light"
              label={t("theme_light")}
              defaultChecked={team.theme === "light"}
              register={form.register}
            />
            <ThemeLabel
              variant="dark"
              value="dark"
              label={t("theme_dark")}
              defaultChecked={team.theme === "dark"}
              register={form.register}
            />
          </div>

          <hr className="my-8 border-gray-200" />
          <div className="mb-6 flex items-center text-sm">
            <div>
              <p className="font-semibold">{t("custom_brand_colors")}</p>
              <p className="mt-0.5 leading-5 text-gray-600">{t("customize_your_brand_colors")}</p>
            </div>
          </div>

          <div className="block justify-between sm:flex">
            <Controller
              name="brandColor"
              control={form.control}
              defaultValue={team.brandColor}
              render={() => (
                <div>
                  <p className="mb-2 block text-sm font-medium text-gray-900">{t("light_brand_color")}</p>
                  <ColorPicker
                    defaultValue={team.brandColor}
                    onChange={(value) => form.setValue("brandColor", value, { shouldDirty: true })}
                  />
                </div>
              )}
            />
            <Controller
              name="darkBrandColor"
              control={form.control}
              defaultValue={team.darkBrandColor}
              render={() => (
                <div className="mt-6 sm:mt-0">
                  <p className="mb-2 block text-sm font-medium text-gray-900">{t("dark_brand_color")}</p>
                  <ColorPicker
                    defaultValue={team.darkBrandColor}
                    onChange={(value) => form.setValue("darkBrandColor", value, { shouldDirty: true })}
                  />
                </div>
              )}
            />
          </div>
          <hr className="my-8 border-gray-200" />

          <div className="flex flex-col gap-8">
            <div className="relative flex items-start">
              <div className="flex-grow text-sm">
                <label htmlFor="hide-branding" className="font-medium text-gray-700">
                  {t("disable_cal_branding", { appName: APP_NAME })}
                </label>
                <p className="text-gray-500">
                  {t("team_disable_cal_branding_description", { appName: APP_NAME })}
                </p>
              </div>

              <div className="flex-none">
                <Controller
                  control={form.control}
                  defaultValue={team?.hideBranding ?? false}
                  name="hideBranding"
                  render={({ field }) => (
                    <Switch
                      defaultChecked={field.value}
                      onCheckedChange={(isChecked) => {
                        form.setValue("hideBranding", isChecked);
                      }}
                    />
                  )}
                />
              </div>
            </div>
            <div className="relative flex items-start">
              <div className="flex-grow text-sm">
                <label htmlFor="hide-branding" className="font-medium text-gray-700">
                  {t("hide_book_a_team_member")}
                </label>
                <p className="text-gray-500">{t("hide_book_a_team_member_description")}</p>
              </div>
              <div className="flex-none">
                <Controller
                  control={form.control}
                  defaultValue={team?.hideBookATeamMember ?? false}
                  name="hideBookATeamMember"
                  render={({ field }) => (
                    <Switch
                      defaultChecked={field.value}
                      onCheckedChange={(isChecked) => {
                        form.setValue("hideBookATeamMember", isChecked);
                      }}
                    />
                  )}
                />
              </div>
            </div>
          </div>
          <Button color="primary" className="mt-8" type="submit" loading={mutation.isLoading}>
            {t("update")}
          </Button>
        </Form>
      ) : (
        <div className="rounded-md border border-gray-200 p-5">
          <span className="text-sm text-gray-600">{t("only_owner_change")}</span>
        </div>
      )}
    </>
  );
};

ProfileView.getLayout = getLayout;

export default ProfileView;
