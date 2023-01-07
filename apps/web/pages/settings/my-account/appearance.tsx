import { GetServerSidePropsContext } from "next";
import { useSession } from "next-auth/react";
import { Controller, useForm } from "react-hook-form";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Badge,
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

import { ssrInit } from "@server/lib/ssr";

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

const AppearanceView = () => {
  const { t } = useLocale();
  const session = useSession();
  const utils = trpc.useContext();
  const { data: user, isLoading } = trpc.viewer.me.useQuery();

  const formMethods = useForm({
    defaultValues: {
      theme: user?.theme,
      brandColor: user?.brandColor || "#292929",
      darkBrandColor: user?.darkBrandColor || "#fafafa",
      hideBranding: user?.hideBranding,
    },
  });

  const {
    formState: { isSubmitting, isDirty },
  } = formMethods;

  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.viewer.me.invalidate();
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  if (isLoading) return <SkeletonLoader title={t("appearance")} description={t("appearance_description")} />;

  if (!user) return null;

  const isDisabled = isSubmitting || !isDirty;

  return (
    <Form
      form={formMethods}
      handleSubmit={(values) => {
        mutation.mutate({
          ...values,
          // Radio values don't support null as values, therefore we convert an empty string
          // back to null here.
          theme: values.theme || null,
        });
      }}>
      <Meta title={t("appearance")} description={t("appearance_description")} />
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
          defaultChecked={user.theme === null}
          register={formMethods.register}
        />
        <ThemeLabel
          variant="light"
          value="light"
          label={t("theme_light")}
          defaultChecked={user.theme === "light"}
          register={formMethods.register}
        />
        <ThemeLabel
          variant="dark"
          value="dark"
          label={t("theme_dark")}
          defaultChecked={user.theme === "dark"}
          register={formMethods.register}
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
          control={formMethods.control}
          defaultValue={user.brandColor}
          render={() => (
            <div>
              <p className="mb-2 block text-sm font-medium text-gray-900">{t("light_brand_color")}</p>
              <ColorPicker
                defaultValue={user.brandColor}
                onChange={(value) => formMethods.setValue("brandColor", value, { shouldDirty: true })}
              />
            </div>
          )}
        />
        <Controller
          name="darkBrandColor"
          control={formMethods.control}
          defaultValue={user.darkBrandColor}
          render={() => (
            <div className="mt-6 sm:mt-0">
              <p className="mb-2 block text-sm font-medium text-gray-900">{t("dark_brand_color")}</p>
              <ColorPicker
                defaultValue={user.darkBrandColor}
                onChange={(value) => formMethods.setValue("darkBrandColor", value, { shouldDirty: true })}
              />
            </div>
          )}
        />
      </div>
      {/* TODO future PR to preview brandColors */}
      {/* <Button
        color="secondary"
        EndIcon={Icon.FiExternalLink}
        className="mt-6"
        onClick={() => window.open(`${WEBAPP_URL}/${user.username}/${user.eventTypes[0].title}`, "_blank")}>
        Preview
      </Button> */}
      <hr className="border-1 my-8 border-neutral-200" />
      <Controller
        name="hideBranding"
        control={formMethods.control}
        defaultValue={user.hideBranding}
        render={({ field: { value } }) => (
          <>
            <div className="flex w-full text-sm">
              <div className="mr-1 flex-grow">
                <div className="flex items-center">
                  <p className="font-semibold ltr:mr-2 rtl:ml-2">
                    {t("disable_cal_branding", { appName: APP_NAME })}
                  </p>
                  <Badge variant="gray">{t("pro")}</Badge>
                </div>
                <p className="mt-0.5  text-gray-600">{t("removes_cal_branding", { appName: APP_NAME })}</p>
              </div>
              <div className="flex-none">
                <Switch
                  id="hideBranding"
                  disabled={!session.data?.user.belongsToActiveTeam}
                  onCheckedChange={(checked) =>
                    formMethods.setValue("hideBranding", checked, { shouldDirty: true })
                  }
                  checked={!session.data?.user.belongsToActiveTeam ? false : value}
                />
              </div>
            </div>
          </>
        )}
      />
      <Button
        disabled={isDisabled}
        type="submit"
        loading={mutation.isLoading}
        color="primary"
        className="mt-8">
        {t("update")}
      </Button>
    </Form>
  );
};

AppearanceView.getLayout = getLayout;

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};

export default AppearanceView;
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
