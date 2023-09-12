import { zodResolver } from "@hookform/resolvers/zod";
import { signOut, useSession } from "next-auth/react";
import type { BaseSyntheticEvent } from "react";
import React, { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import OrganizationAvatar from "@calcom/features/ee/organizations/components/OrganizationAvatar";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { APP_NAME, FULL_NAME_LENGTH_MAX_LIMIT } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import turndown from "@calcom/lib/turndownService";
import { IdentityProvider } from "@calcom/prisma/enums";
import type { TRPCClientErrorLike } from "@calcom/trpc/client";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";
import {
  Alert,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  Editor,
  Form,
  ImageUploader,
  Label,
  Meta,
  PasswordField,
  showToast,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
  TextField,
} from "@calcom/ui";
import { AlertTriangle, Trash2 } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";
import TwoFactor from "@components/auth/TwoFactor";
import { UsernameAvailabilityField } from "@components/ui/UsernameAvailability";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} />
      <div className="mb-8 space-y-6">
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

interface DeleteAccountValues {
  totpCode: string;
}

type FormValues = {
  username: string;
  avatar: string;
  name: string;
  email: string;
  bio: string;
};

const ProfileView = () => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { update } = useSession();

  const { data: user, isLoading } = trpc.viewer.me.useQuery();
  const updateProfileMutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: async (res) => {
      await update(res);
      showToast(t("settings_updated_successfully"), "success");

      // signout user only in case of password reset
      if (res.signOutUser && tempFormValues && res.passwordReset) {
        showToast(t("password_reset_email", { email: tempFormValues.email }), "success");
        await signOut({ callbackUrl: "/auth/logout?passReset=true" });
      } else {
        utils.viewer.me.invalidate();
        utils.viewer.avatar.invalidate();
        utils.viewer.shouldVerifyEmail.invalidate();
      }

      setConfirmAuthEmailChangeWarningDialogOpen(false);
      setTempFormValues(null);
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);
  const [tempFormValues, setTempFormValues] = useState<FormValues | null>(null);
  const [confirmPasswordErrorMessage, setConfirmPasswordDeleteErrorMessage] = useState("");
  const [confirmAuthEmailChangeWarningDialogOpen, setConfirmAuthEmailChangeWarningDialogOpen] =
    useState(false);

  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [hasDeleteErrors, setHasDeleteErrors] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
  const form = useForm<DeleteAccountValues>();

  const onDeleteMeSuccessMutation = async () => {
    await utils.viewer.me.invalidate();
    showToast(t("Your account was deleted"), "success");

    setHasDeleteErrors(false); // dismiss any open errors
    if (process.env.NEXT_PUBLIC_WEBAPP_URL === "https://app.cal.com") {
      signOut({ callbackUrl: "/auth/logout?survey=true" });
    } else {
      signOut({ callbackUrl: "/auth/logout" });
    }
  };

  const confirmPasswordMutation = trpc.viewer.auth.verifyPassword.useMutation({
    onSuccess() {
      if (tempFormValues) updateProfileMutation.mutate(tempFormValues);
      setConfirmPasswordOpen(false);
    },
    onError() {
      setConfirmPasswordDeleteErrorMessage(t("incorrect_password"));
    },
  });

  const onDeleteMeErrorMutation = (error: TRPCClientErrorLike<AppRouter>) => {
    setHasDeleteErrors(true);
    setDeleteErrorMessage(errorMessages[error.message]);
  };
  const deleteMeMutation = trpc.viewer.deleteMe.useMutation({
    onSuccess: onDeleteMeSuccessMutation,
    onError: onDeleteMeErrorMutation,
    async onSettled() {
      await utils.viewer.me.invalidate();
    },
  });
  const deleteMeWithoutPasswordMutation = trpc.viewer.deleteMeWithoutPassword.useMutation({
    onSuccess: onDeleteMeSuccessMutation,
    onError: onDeleteMeErrorMutation,
    async onSettled() {
      await utils.viewer.me.invalidate();
    },
  });

  const isCALIdentityProvider = user?.identityProvider === IdentityProvider.CAL;

  const onConfirmPassword = (e: Event | React.MouseEvent<HTMLElement, MouseEvent>) => {
    e.preventDefault();

    const password = passwordRef.current.value;
    confirmPasswordMutation.mutate({ passwordInput: password });
  };

  const onConfirmAuthEmailChange = (e: Event | React.MouseEvent<HTMLElement, MouseEvent>) => {
    e.preventDefault();

    if (tempFormValues) updateProfileMutation.mutate(tempFormValues);
  };

  const onConfirmButton = (e: Event | React.MouseEvent<HTMLElement, MouseEvent>) => {
    e.preventDefault();
    if (isCALIdentityProvider) {
      const totpCode = form.getValues("totpCode");
      const password = passwordRef.current.value;
      deleteMeMutation.mutate({ password, totpCode });
    } else {
      deleteMeWithoutPasswordMutation.mutate();
    }
  };

  const onConfirm = ({ totpCode }: DeleteAccountValues, e: BaseSyntheticEvent | undefined) => {
    e?.preventDefault();
    if (isCALIdentityProvider) {
      const password = passwordRef.current.value;
      deleteMeMutation.mutate({ password, totpCode });
    } else {
      deleteMeWithoutPasswordMutation.mutate();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const passwordRef = useRef<HTMLInputElement>(null!);

  const errorMessages: { [key: string]: string } = {
    [ErrorCode.SecondFactorRequired]: t("2fa_enabled_instructions"),
    [ErrorCode.IncorrectPassword]: `${t("incorrect_password")} ${t("please_try_again")}`,
    [ErrorCode.UserNotFound]: t("no_account_exists"),
    [ErrorCode.IncorrectTwoFactorCode]: `${t("incorrect_2fa_code")} ${t("please_try_again")}`,
    [ErrorCode.InternalServerError]: `${t("something_went_wrong")} ${t("please_try_again_and_contact_us")}`,
    [ErrorCode.ThirdPartyIdentityProviderEnabled]: t("account_created_with_identity_provider"),
  };

  if (isLoading || !user)
    return (
      <SkeletonLoader title={t("profile")} description={t("profile_description", { appName: APP_NAME })} />
    );

  const defaultValues = {
    username: user.username || "",
    avatar: user.avatar || "",
    name: user.name || "",
    email: user.email || "",
    bio: user.bio || "",
  };

  return (
    <>
      <Meta title={t("profile")} description={t("profile_description", { appName: APP_NAME })} />
      <ProfileForm
        key={JSON.stringify(defaultValues)}
        defaultValues={defaultValues}
        isLoading={updateProfileMutation.isLoading}
        userOrganization={user.organization}
        onSubmit={(values) => {
          if (values.email !== user.email && isCALIdentityProvider) {
            setTempFormValues(values);
            setConfirmPasswordOpen(true);
          } else if (values.email !== user.email && !isCALIdentityProvider) {
            setTempFormValues(values);
            // Opens a dialog warning the change
            setConfirmAuthEmailChangeWarningDialogOpen(true);
          } else {
            updateProfileMutation.mutate(values);
          }
        }}
        extraField={
          <div className="mt-8">
            <UsernameAvailabilityField
              onSuccessMutation={async () => {
                showToast(t("settings_updated_successfully"), "success");
                await utils.viewer.me.invalidate();
              }}
              onErrorMutation={() => {
                showToast(t("error_updating_settings"), "error");
              }}
            />
          </div>
        }
      />

      <hr className="border-subtle my-6" />

      <Label>{t("danger_zone")}</Label>
      {/* Delete account Dialog */}
      <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <DialogTrigger asChild>
          <Button data-testid="delete-account" color="destructive" className="mt-1" StartIcon={Trash2}>
            {t("delete_account")}
          </Button>
        </DialogTrigger>
        <DialogContent
          title={t("delete_account_modal_title")}
          description={t("confirm_delete_account_modal", { appName: APP_NAME })}
          type="creation"
          Icon={AlertTriangle}>
          <>
            <div className="mb-10">
              <p className="text-default mb-4">
                {t("delete_account_confirmation_message", { appName: APP_NAME })}
              </p>
              {isCALIdentityProvider && (
                <PasswordField
                  data-testid="password"
                  name="password"
                  id="password"
                  autoComplete="current-password"
                  required
                  label="Password"
                  ref={passwordRef}
                />
              )}

              {user?.twoFactorEnabled && isCALIdentityProvider && (
                <Form handleSubmit={onConfirm} className="pb-4" form={form}>
                  <TwoFactor center={false} />
                </Form>
              )}

              {hasDeleteErrors && <Alert severity="error" title={deleteErrorMessage} />}
            </div>
            <DialogFooter showDivider>
              <DialogClose />
              <Button
                color="primary"
                data-testid="delete-account-confirm"
                onClick={(e) => onConfirmButton(e)}>
                {t("delete_my_account")}
              </Button>
            </DialogFooter>
          </>
        </DialogContent>
      </Dialog>

      {/* If changing email, confirm password */}
      <Dialog open={confirmPasswordOpen} onOpenChange={setConfirmPasswordOpen}>
        <DialogContent
          title={t("confirm_password")}
          description={t("confirm_password_change_email")}
          type="creation"
          Icon={AlertTriangle}>
          <div className="mb-10">
            <PasswordField
              data-testid="password"
              name="password"
              id="password"
              autoComplete="current-password"
              required
              label="Password"
              ref={passwordRef}
            />

            {confirmPasswordErrorMessage && <Alert severity="error" title={confirmPasswordErrorMessage} />}
          </div>
          <DialogFooter showDivider>
            <Button
              color="primary"
              loading={confirmPasswordMutation.isLoading}
              onClick={(e) => onConfirmPassword(e)}>
              {t("confirm")}
            </Button>
            <DialogClose />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* If changing email from !CAL Login */}
      <Dialog
        open={confirmAuthEmailChangeWarningDialogOpen}
        onOpenChange={setConfirmAuthEmailChangeWarningDialogOpen}>
        <DialogContent
          title={t("confirm_auth_change")}
          description={t("confirm_auth_email_change")}
          type="creation"
          Icon={AlertTriangle}>
          <DialogFooter>
            <Button
              color="primary"
              loading={updateProfileMutation.isLoading}
              onClick={(e) => onConfirmAuthEmailChange(e)}>
              {t("confirm")}
            </Button>
            <DialogClose />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const ProfileForm = ({
  defaultValues,
  onSubmit,
  extraField,
  isLoading = false,
  userOrganization,
}: {
  defaultValues: FormValues;
  onSubmit: (values: FormValues) => void;
  extraField?: React.ReactNode;
  isLoading: boolean;
  userOrganization: RouterOutputs["viewer"]["me"]["organization"];
}) => {
  const { t } = useLocale();
  const [firstRender, setFirstRender] = useState(true);

  const profileFormSchema = z.object({
    username: z.string(),
    avatar: z.string(),
    name: z
      .string()
      .trim()
      .min(1, t("you_need_to_add_a_name"))
      .max(FULL_NAME_LENGTH_MAX_LIMIT, {
        message: t("max_limit_allowed_hint", { limit: FULL_NAME_LENGTH_MAX_LIMIT }),
      }),
    email: z.string().email(),
    bio: z.string(),
  });

  const formMethods = useForm<FormValues>({
    defaultValues,
    resolver: zodResolver(profileFormSchema),
  });

  const {
    formState: { isSubmitting, isDirty },
  } = formMethods;

  const isDisabled = isSubmitting || !isDirty;

  return (
    <Form form={formMethods} handleSubmit={onSubmit}>
      <div className="flex items-center">
        <Controller
          control={formMethods.control}
          name="avatar"
          render={({ field: { value } }) => (
            <>
              <OrganizationAvatar
                alt={formMethods.getValues("username")}
                imageSrc={value}
                size="lg"
                organizationSlug={userOrganization.slug}
              />
              <div className="ms-4">
                <ImageUploader
                  target="avatar"
                  id="avatar-upload"
                  buttonMsg={t("change_avatar")}
                  handleAvatarChange={(newAvatar) => {
                    formMethods.setValue("avatar", newAvatar, { shouldDirty: true });
                  }}
                  imageSrc={value || undefined}
                />
              </div>
            </>
          )}
        />
      </div>
      {extraField}
      <div className="mt-8">
        <TextField label={t("full_name")} {...formMethods.register("name")} />
      </div>
      <div className="mt-8">
        <TextField label={t("email")} hint={t("change_email_hint")} {...formMethods.register("email")} />
      </div>
      <div className="mt-8">
        <Label>{t("about")}</Label>
        <Editor
          getText={() => md.render(formMethods.getValues("bio") || "")}
          setText={(value: string) => {
            formMethods.setValue("bio", turndown(value), { shouldDirty: true });
          }}
          excludedToolbarItems={["blockType"]}
          disableLists
          firstRender={firstRender}
          setFirstRender={setFirstRender}
        />
      </div>
      <Button loading={isLoading} disabled={isDisabled} color="primary" className="mt-8" type="submit">
        {t("update")}
      </Button>
    </Form>
  );
};

ProfileView.getLayout = getLayout;
ProfileView.PageWrapper = PageWrapper;

export default ProfileView;
