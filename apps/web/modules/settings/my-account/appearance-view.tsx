"use client";

import { Button } from "@calid/features/ui/components/button";
import ThemeCard from "@calid/features/ui/components/card/theme-card";
import { triggerToast } from "@calid/features/ui/components/toast";
import { revalidateSettingsAppearance } from "app/(use-page-wrapper)/settings/(settings-layout)/my-account/appearance/actions";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { BookerLayoutSelector } from "@calcom/features/settings/BookerLayoutSelector";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import useGetBrandingColours from "@calcom/lib/getBrandColours";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { validateBookerLayouts } from "@calcom/lib/validateBookerLayouts";
import { localStorage } from "@calcom/lib/webstorage";
import type { userMetadata } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Form } from "@calcom/ui/components/form";
import { useCalcomTheme } from "@calcom/ui/styles";

const useBrandColors = (
  currentTheme: string | null,
  {
    brandColor,
    darkBrandColor,
  }: {
    brandColor?: string | null;
    darkBrandColor?: string | null;
  }
): void => {
  const brandTheme = useGetBrandingColours({
    lightVal: brandColor,
    darkVal: darkBrandColor,
  });
  const selectedTheme = currentTheme ? brandTheme[currentTheme as "light" | "dark"] : {};
  useCalcomTheme({
    root: selectedTheme,
  });
};

const AppearanceView = ({ user }: { user: RouterOutputs["viewer"]["me"]["get"] }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const session = useSession();
  const isApartOfOrganization = session.data?.user.org?.id;
  useTheme(user?.appTheme);
  useBrandColors(user?.appTheme ?? null, {
    brandColor: user?.brandColor,
    darkBrandColor: user?.darkBrandColor,
  });

  const userAppThemeFormMethods = useForm({
    defaultValues: {
      appTheme: user.appTheme,
    },
  });

  const {
    formState: { isSubmitting: isUserAppThemeSubmitting, isDirty: isUserAppThemeDirty },
    reset: resetUserAppThemeReset,
  } = userAppThemeFormMethods;

  const userThemeFormMethods = useForm({
    defaultValues: {
      theme: user.theme,
    },
  });

  const {
    formState: { isSubmitting: isUserThemeSubmitting, isDirty: isUserThemeDirty },
    reset: resetUserThemeReset,
  } = userThemeFormMethods;

  const bookerLayoutFormMethods = useForm({
    defaultValues: {
      metadata: user.metadata as z.infer<typeof userMetadata>,
    },
  });

  const {
    formState: { isSubmitting: isBookerLayoutFormSubmitting, isDirty: isBookerLayoutFormDirty },
    reset: resetBookerLayoutThemeReset,
  } = bookerLayoutFormMethods;

  const selectedTheme = userThemeFormMethods.watch("theme");
  const selectedThemeIsDark =
    selectedTheme === "dark" ||
    (selectedTheme === "" &&
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"));

  const mutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async (data) => {
      await utils.viewer.me.invalidate();
      revalidateSettingsAppearance();
      triggerToast(t("settings_updated_successfully"), "success");
      resetBookerLayoutThemeReset({ metadata: data.metadata });
      resetUserThemeReset({ theme: data.theme });
      resetUserAppThemeReset({ appTheme: data.appTheme });
    },
    onError: (error) => {
      if (error.message) {
        triggerToast(error.message, "error");
      } else {
        triggerToast(t("error_updating_settings"), "error");
      }
    },
    onSettled: async () => {
      await utils.viewer.me.invalidate();
      revalidateSettingsAppearance();
    },
  });

  return (
    <SettingsHeader
      title={t("appearance")}
      description={t("appearance_description")}
      borderInShellHeader={false}>
      <div className="border-default mt-6 flex items-center rounded-b-none rounded-t-lg border-x border-t px-6 pt-6 text-sm">
        <div>
          <p className="text-default text-sm font-semibold">{t("app_theme")}</p>
          <p className="text-subtle tex-sm">{t("app_theme_applies_note")}</p>
        </div>
      </div>
      <Form
        form={userAppThemeFormMethods}
        handleSubmit={({ appTheme }) => {
          if (appTheme === "system") {
            appTheme = null;
            localStorage.removeItem(`app-theme`);
          }
          mutation.mutate({
            appTheme,
          });
        }}>
        <div className="border-default rounded-b-lg border-x border-b">
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
            <ThemeCard
              variant="system"
              value="system"
              label={t("theme_system")}
              defaultChecked={user.appTheme === null}
              register={userAppThemeFormMethods.register}
              fieldName="appTheme"
              currentValue={userAppThemeFormMethods.watch("appTheme")}
            />
            <ThemeCard
              variant="light"
              value="light"
              label={t("light")}
              defaultChecked={user.appTheme === "light"}
              register={userAppThemeFormMethods.register}
              fieldName="appTheme"
              currentValue={userAppThemeFormMethods.watch("appTheme")}
            />
            <ThemeCard
              variant="dark"
              value="dark"
              label={t("dark")}
              defaultChecked={user.appTheme === "dark"}
              register={userAppThemeFormMethods.register}
              fieldName="appTheme"
              currentValue={userAppThemeFormMethods.watch("appTheme")}
            />
          </div>
          <div className="flex flex-row justify-start px-6 pb-4">
            <Button
              loading={mutation.isPending}
              disabled={isUserAppThemeSubmitting || !isUserAppThemeDirty}
              type="submit"
              data-testid="update-app-theme-btn"
              color="primary">
              {t("update")}
            </Button>
          </div>
        </div>
      </Form>

      {isApartOfOrganization ? null : (
        <>
          <div className="border-default mt-6 flex items-center rounded-b-none rounded-t-lg border-x border-t px-6 pt-6 text-sm">
            <div>
              <p className="text-default text-sm font-semibold">{t("theme")}</p>
              <p className="text-subtle text-sm">{t("theme_applies_note")}</p>
            </div>
          </div>
          <Form
            form={userThemeFormMethods}
            handleSubmit={({ theme }) => {
              if (theme === "light" || theme === "dark") {
                mutation.mutate({
                  theme,
                });
                return;
              }
              mutation.mutate({
                theme: null,
              });
            }}>
            <div className="border-default rounded-b-lg border-x border-b">
              <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
                <ThemeCard
                  variant="system"
                  value="system"
                  label={t("theme_system")}
                  defaultChecked={user.theme === null}
                  register={userThemeFormMethods.register}
                  fieldName="theme"
                  currentValue={userThemeFormMethods.watch("theme")}
                />
                <ThemeCard
                  variant="light"
                  value="light"
                  label={t("light")}
                  defaultChecked={user.theme === "light"}
                  register={userThemeFormMethods.register}
                  fieldName="theme"
                  currentValue={userThemeFormMethods.watch("theme")}
                />
                <ThemeCard
                  variant="dark"
                  value="dark"
                  label={t("dark")}
                  defaultChecked={user.theme === "dark"}
                  register={userThemeFormMethods.register}
                  fieldName="theme"
                  currentValue={userThemeFormMethods.watch("theme")}
                />
              </div>

              <div className="flex flex-row justify-start px-6 pb-4">
                <Button
                  loading={mutation.isPending}
                  disabled={isUserThemeSubmitting || !isUserThemeDirty}
                  type="submit"
                  data-testid="update-theme-btn"
                  color="primary">
                  {t("update")}
                </Button>
              </div>
            </div>
          </Form>
          <Form
            form={bookerLayoutFormMethods}
            className="mt-6"
            handleSubmit={(values) => {
              const layoutError = validateBookerLayouts(values?.metadata?.defaultBookerLayouts || null);
              if (layoutError) {
                triggerToast(t(layoutError), "error");
                return;
              } else {
                mutation.mutate(values);
              }
            }}>
            <BookerLayoutSelector
              isDark={selectedThemeIsDark}
              name="metadata.defaultBookerLayouts"
              title={t("bookerlayout_user_settings_title")}
              description={t("bookerlayout_user_settings_description")}
              isDisabled={isBookerLayoutFormSubmitting || !isBookerLayoutFormDirty}
              isLoading={mutation.isPending}
              user={user}
            />
          </Form>
        </>
      )}
    </SettingsHeader>
  );
};

export default AppearanceView;
