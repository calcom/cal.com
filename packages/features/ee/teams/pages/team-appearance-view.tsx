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
  getSettingsLayout as getLayout,
  Meta,
  showToast,
  Switch,
} from "@calcom/ui";

interface TeamAppearanceValues {
  hideBranding: boolean;
  theme: string | null;
  brandColor: string;
  darkBrandColor: string;
}

const ProfileView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();

  const { data: team, isLoading } = trpc.viewer.teams.get.useQuery(
    { teamId: Number(router.query.id) },
    {
      onError: () => {
        router.push("/settings");
      },
    }
  );

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      showToast(t("your_team_updated_successfully"), "success");
    },
  });

  const form = useForm<TeamAppearanceValues>({
    defaultValues: {
      theme: team?.theme,
      brandColor: team?.brandColor || "#292929",
      darkBrandColor: team?.darkBrandColor || "#fafafa",
      hideBranding: team?.hideBranding,
    },
  });

  const {
    formState: { isSubmitting, isDirty },
  } = form;

  const isDisabled = isSubmitting || !isDirty;

  const isAdmin =
    team && (team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN);

  if (isLoading || !team) return null;

  return (
    <>
      <Meta title={t("booking_appearance")} description={t("appearance_team_description")} />
      {isAdmin ? (
        <Form
          form={form}
          handleSubmit={(values) => {
            if (team) {
              mutation.mutate({
                id: team.id,
                ...values,
                // Radio values don't support null as values, therefore we convert an empty string
                // back to null here.
                theme: values.theme || null,
              });
            }
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
          <hr className="border-1 my-8 border-neutral-200" />
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

          <hr className="border-1 my-8 border-neutral-200" />
          <div className="relative flex items-start">
            <div className="flex-grow text-sm">
              <label htmlFor="hide-branding" className="font-semibold">
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
          <Button
            disabled={isDisabled}
            color="primary"
            className="mt-8"
            type="submit"
            loading={mutation.isLoading}>
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

interface ThemeLabelProps {
  variant: "light" | "dark" | "system";
  value?: "light" | "dark" | null;
  label: string;
  defaultChecked?: boolean;
  register: any;
}

const ThemeLabel = ({ variant, label, value, defaultChecked, register }: ThemeLabelProps) => {
  return (
    <label
      className="relative mb-4 flex-1 cursor-pointer text-center last:mb-0 last:mr-0 sm:mr-4 sm:mb-0"
      htmlFor={`theme-${variant}`}>
      <input
        className="peer absolute top-8 left-8"
        type="radio"
        value={value}
        id={`theme-${variant}`}
        defaultChecked={defaultChecked}
        {...register("theme")}
      />
      <div className="relative z-10 rounded-lg ring-black transition-all peer-checked:ring-2">
        <img
          aria-hidden="true"
          className="cover w-full rounded-lg"
          src={`/theme-${variant}.svg`}
          alt={`theme ${variant}`}
        />
      </div>
      <p className="mt-2 text-sm font-medium text-gray-600 peer-checked:text-gray-900">{label}</p>
    </label>
  );
};
