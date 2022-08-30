import { GetServerSidePropsContext } from "next";
import { Trans } from "next-i18next";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { trpc } from "@calcom/trpc/react";
import Badge from "@calcom/ui/v2/core/Badge";
import { Button } from "@calcom/ui/v2/core/Button";
import Meta from "@calcom/ui/v2/core/Meta";
import Switch from "@calcom/ui/v2/core/Switch";
import ColorPicker from "@calcom/ui/v2/core/colorpicker";
import Select from "@calcom/ui/v2/core/form/Select";
import { Form } from "@calcom/ui/v2/core/form/fields";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";
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

  const themeOptions = [
    { value: "light", label: t("light") },
    { value: "dark", label: t("dark") },
  ];

  const formMethods = useForm();

  return (
    <Form
      form={formMethods}
      handleSubmit={(values) => {
        mutation.mutate({
          ...values,
          theme: values.theme.value,
        });
      }}>
      <Meta title="appearance" description="appearance_description" />
      <Controller
        name="theme"
        control={formMethods.control}
        defaultValue={user.theme}
        render={({ field: { value } }) => (
          <>
            <div className="flex items-center">
              <div>
                <p className="font-semibold">{t("follow_system_preferences")}</p>
                <p className="text-gray-600">
                  <Trans i18nKey="system_preference_description">
                    Automatically adjust theme based on invitee system preferences. Note: This only applies to
                    the booking pages.
                  </Trans>
                </p>
              </div>
              <Switch
                onCheckedChange={(checked) => formMethods.setValue("theme", checked ? null : themeOptions[0])}
                checked={!value}
              />
            </div>
            <div>
              <Select
                options={themeOptions}
                onChange={(event) => {
                  if (event) formMethods.setValue("theme", { ...event });
                }}
                isDisabled={!value}
                defaultValue={value || themeOptions[0]}
                value={value || themeOptions[0]}
              />
            </div>
          </>
        )}
      />

      <hr className="border-1 my-8 border-neutral-200" />
      <div className="mb-6 flex items-center">
        <div>
          <p className="font-semibold">{t("custom_brand_colors")}</p>
          <p className="text-gray-600">{t("customize_your_brand_colors")}</p>
        </div>
      </div>

      <div className="flex justify-between">
        <Controller
          name="brandColor"
          control={formMethods.control}
          defaultValue={user.brandColor}
          render={({ field: { value } }) => (
            <div>
              <p className="block text-sm font-medium text-gray-900">{t("light_brand_color")}</p>
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
            <div>
              <p className="block text-sm font-medium text-gray-900">{t("dark_brand_color")}</p>
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
            <div className="flex items-center">
              <div>
                <div className="flex items-center">
                  <p className="mr-2 font-semibold">{t("disable_cal_branding")}</p>{" "}
                  <Badge variant="gray">{t("pro")}</Badge>
                </div>
                <p className="text-gray-600">{t("removes_cal_branding")}</p>
              </div>
              <Switch
                onCheckedChange={(checked) => formMethods.setValue("hideBranding", checked)}
                checked={value}
              />
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
