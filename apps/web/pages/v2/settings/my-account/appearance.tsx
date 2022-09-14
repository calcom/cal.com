import { GetServerSidePropsContext } from "next";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { trpc } from "@calcom/trpc/react";
import Badge from "@calcom/ui/v2/core/Badge";
import { Button } from "@calcom/ui/v2/core/Button";
import Meta from "@calcom/ui/v2/core/Meta";
import Switch from "@calcom/ui/v2/core/Switch";
import ColorPicker from "@calcom/ui/v2/core/colorpicker";
import { Form } from "@calcom/ui/v2/core/form/fields";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";
import showToast from "@calcom/ui/v2/core/notifications";

import { getSession } from "@lib/auth";
import { inferSSRProps } from "@lib/types/inferSSRProps";

const AppearanceView = (props: inferSSRProps<typeof getServerSideProps>) => {
  const { t } = useLocale();
  const { user } = props;

  const mutation = trpc.useMutation("viewer.updateProfile", {
    onSuccess: () => {
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const formMethods = useForm();

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
      <Meta title="Appearance" description="Manage settings for your booking appearance" />
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
          render={({ field: { value } }) => (
            <div>
              <p className="mb-2 block text-sm font-medium text-gray-900">{t("light_brand_color")}</p>
              <ColorPicker
                defaultValue={user.brandColor}
                onChange={(value) => formMethods.setValue("brandColor", value)}
              />
            </div>
          )}
        />
        <Controller
          name="darkBrandColor"
          control={formMethods.control}
          defaultValue={user.darkBrandColor}
          render={({ field: { value } }) => (
            <div className="mt-6 sm:mt-0">
              <p className="mb-2 block text-sm font-medium text-gray-900">{t("dark_brand_color")}</p>
              <ColorPicker
                defaultValue={user.darkBrandColor}
                onChange={(value) => formMethods.setValue("darkBrandColor", value)}
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
                  <p className="mr-2 font-semibold">{t("disable_cal_branding")}</p>{" "}
                  <Badge variant="gray">{t("pro")}</Badge>
                </div>
                <p className="mt-0.5  text-gray-600">{t("removes_cal_branding")}</p>
              </div>
              <div className="flex-none">
                <Switch
                  onCheckedChange={(checked) => formMethods.setValue("hideBranding", checked)}
                  checked={value}
                />
              </div>
            </div>
          </>
        )}
      />
      <Button color="primary" className="mt-8">
        {t("update")}
      </Button>
    </Form>
  );
};

AppearanceView.getLayout = getLayout;

export default AppearanceView;

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getSession(context);

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      username: true,
      timeZone: true,
      timeFormat: true,
      weekStart: true,
      brandColor: true,
      darkBrandColor: true,
      hideBranding: true,
      theme: true,
      eventTypes: {
        select: {
          title: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User seems logged in but cannot be found in the db");
  }

  return {
    props: {
      user,
    },
  };
};

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
