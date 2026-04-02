"use client";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { isCompanyEmail } from "@calcom/features/ee/organizations/lib/utils";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { IdentityProvider } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/types/server/routers/_app";
import SecondaryEmailConfirmModal from "@components/settings/SecondaryEmailConfirmModal";
import SecondaryEmailModal from "@components/settings/SecondaryEmailModal";
import { UsernameAvailabilityField } from "@components/ui/UsernameAvailability";
import { toastManager } from "@coss/ui/components/toast";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@coss/ui/shared/app-header";
import type { TRPCClientErrorLike } from "@trpc/client";
import { revalidateSettingsProfile } from "app/cache/path/settings/my-account";
import { signOut, useSession } from "next-auth/react";
import type React from "react";
import type { BaseSyntheticEvent } from "react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { CompanyEmailOrganizationBanner } from "./components/CompanyEmailOrganizationBanner";
import { ConfirmPasswordDialog } from "./components/confirm-password-dialog";
import { CreatePasswordDialog } from "./components/create-password-dialog";
import { DeleteAccountDialog } from "./components/delete-account-dialog";
import { DisconnectAccountDialog } from "./components/disconnect-account-dialog";
import { ProfileDangerZone } from "./components/profile-danger-zone";
import { ProfileFormCard } from "./components/profile-form-card";
import type {
  ProfileFormValues,
  ProfileSubmitValues,
} from "./components/profile-form-card";

interface DeleteAccountValues {
  totpCode: string;
}

type Props = {
  user: RouterOutputs["viewer"]["me"]["get"];
};

const ProfileView = ({ user }: Props) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const session = useSession();
  const { update } = session;

  const [tempFormValues, setTempFormValues] =
    useState<ProfileSubmitValues | null>(null);

  const updateProfileMutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async (res) => {
      await update(res);
      utils.viewer.me.invalidate();
      utils.viewer.me.shouldVerifyEmail.invalidate();
      revalidateSettingsProfile();

      if (res.hasEmailBeenChanged && res.sendEmailVerification) {
        toastManager.add({
          title: t("change_of_email_toast", { email: tempFormValues?.email }),
          type: "success",
        });
      } else {
        toastManager.add({
          title: t("settings_updated_successfully"),
          type: "success",
        });
      }

      setTempFormValues(null);
    },
    onError: (e) => {
      switch (e.message) {
        case "email_already_used":
          toastManager.add({ title: t(e.message), type: "error" });
          return;
        default:
          toastManager.add({
            title: t("error_updating_settings"),
            type: "error",
          });
      }
    },
  });

  const unlinkConnectedAccountMutation =
    trpc.viewer.loggedInViewerRouter.unlinkConnectedAccount.useMutation({
      onSuccess: async (res) => {
        toastManager.add({ title: t(res.message), type: "success" });
        utils.viewer.me.invalidate();
        revalidateSettingsProfile();
      },
      onError: (e) => {
        toastManager.add({ title: t(e.message), type: "error" });
      },
    });

  const addSecondaryEmailMutation =
    trpc.viewer.loggedInViewerRouter.addSecondaryEmail.useMutation({
      onSuccess: (res) => {
        setShowSecondaryEmailModal(false);
        setNewlyAddedSecondaryEmail(res?.data?.email);
        utils.viewer.me.invalidate();
        revalidateSettingsProfile();
      },
      onError: (error) => {
        setSecondaryEmailAddErrorMessage(error?.message || "");
      },
    });

  const resendVerifyEmailMutation =
    trpc.viewer.auth.resendVerifyEmail.useMutation();

  const confirmPasswordMutation = trpc.viewer.auth.verifyPassword.useMutation({
    onSuccess() {
      if (tempFormValues) updateProfileMutation.mutate(tempFormValues);
      setConfirmPasswordOpen(false);
    },
    onError() {
      setConfirmPasswordErrorMessage(t("incorrect_password"));
    },
  });

  const onDeleteMeSuccess = async () => {
    await utils.viewer.me.invalidate();
    revalidateSettingsProfile();
    toastManager.add({ title: t("Your account was deleted"), type: "success" });
    setHasDeleteErrors(false);
    if (process.env.NEXT_PUBLIC_WEBAPP_URL === "https://app.cal.com") {
      signOut({ callbackUrl: "/auth/logout?survey=true" });
    } else {
      signOut({ callbackUrl: "/auth/logout" });
    }
  };

  const onDeleteMeError = (error: TRPCClientErrorLike<AppRouter>) => {
    setHasDeleteErrors(true);
    setDeleteErrorMessage(errorMessages[error.message]);
  };

  const deleteMeMutation = trpc.viewer.me.deleteMe.useMutation({
    onSuccess: onDeleteMeSuccess,
    onError: onDeleteMeError,
    async onSettled() {
      await utils.viewer.me.invalidate();
      revalidateSettingsProfile();
    },
  });

  const deleteMeWithoutPasswordMutation =
    trpc.viewer.me.deleteMeWithoutPassword.useMutation({
      onSuccess: onDeleteMeSuccess,
      onError: onDeleteMeError,
      async onSettled() {
        await utils.viewer.me.invalidate();
        revalidateSettingsProfile();
      },
    });

  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);
  const [confirmPasswordErrorMessage, setConfirmPasswordErrorMessage] =
    useState("");
  const [showCreatePasswordDialog, setShowCreatePasswordDialog] =
    useState(false);
  const [showDisconnectWarning, setShowDisconnectWarning] = useState(false);
  const [showSecondaryEmailModal, setShowSecondaryEmailModal] = useState(false);
  const [secondaryEmailAddErrorMessage, setSecondaryEmailAddErrorMessage] =
    useState("");
  const [newlyAddedSecondaryEmail, setNewlyAddedSecondaryEmail] = useState<
    string | undefined
  >(undefined);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [hasDeleteErrors, setHasDeleteErrors] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
  const [isCompanyEmailAlertDismissed, setIsCompanyEmailAlertDismissed] =
    useState(false);

  const deleteForm = useForm<DeleteAccountValues>();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const passwordRef = useRef<HTMLInputElement>(null!);

  const isCALIdentityProvider = user?.identityProvider === IdentityProvider.CAL;

  const errorMessages: { [key: string]: string } = {
    [ErrorCode.SecondFactorRequired]: t("2fa_enabled_instructions"),
    [ErrorCode.IncorrectPassword]: `${t("incorrect_password")} ${t(
      "please_try_again"
    )}`,
    [ErrorCode.UserNotFound]: t("no_account_exists"),
    [ErrorCode.IncorrectTwoFactorCode]: `${t("incorrect_2fa_code")} ${t(
      "please_try_again"
    )}`,
    [ErrorCode.InternalServerError]: `${t("something_went_wrong")} ${t(
      "please_try_again_and_contact_us"
    )}`,
    [ErrorCode.ThirdPartyIdentityProviderEnabled]: t(
      "account_created_with_identity_provider"
    ),
  };

  const { data: usersAttributes } = trpc.viewer.attributes.getByUserId.useQuery(
    {
      userId: user.id,
    }
  );

  const userEmail = user.email || "";

  const defaultValues: ProfileFormValues = {
    username: user.username || "",
    avatarUrl: user.avatarUrl,
    name: user.name || "",
    email: userEmail,
    bio: user.bio || "",
    secondaryEmails: [
      {
        id: 0,
        email: userEmail,
        emailVerified: user.emailVerified?.toString() || null,
        emailPrimary: true,
      },
      ...(user.secondaryEmails || []).map((se) => ({
        ...se,
        emailVerified: se.emailVerified?.toString() || null,
        emailPrimary: false,
      })),
    ],
  };

  const shouldShowCompanyEmailAlert =
    !isCompanyEmailAlertDismissed &&
    !session.data?.user?.org?.id &&
    !user.organization?.id &&
    userEmail &&
    isCompanyEmail(userEmail);

  const showConnectedAccounts =
    !isCALIdentityProvider && user.email !== user.identityProviderEmail;

  const handleProfileSubmit = (values: ProfileSubmitValues) => {
    if (values.email !== user.email && isCALIdentityProvider) {
      setTempFormValues(values);
      setConfirmPasswordOpen(true);
    } else {
      updateProfileMutation.mutate(values);
    }
  };

  const handleConfirmPassword = (
    e: Event | React.MouseEvent<HTMLElement, MouseEvent>
  ) => {
    e.preventDefault();
    confirmPasswordMutation.mutate({
      passwordInput: passwordRef.current.value,
    });
  };

  const handleDeleteConfirm = (
    e: Event | React.MouseEvent<HTMLElement, MouseEvent>
  ) => {
    e.preventDefault();
    if (isCALIdentityProvider) {
      const totpCode = deleteForm.getValues("totpCode");
      const password = passwordRef.current.value;
      deleteMeMutation.mutate({ password, totpCode });
    } else {
      deleteMeWithoutPasswordMutation.mutate();
    }
  };

  const handleTwoFactorSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    deleteForm.handleSubmit(({ totpCode }) => {
      if (isCALIdentityProvider) {
        deleteMeMutation.mutate({
          password: passwordRef.current.value,
          totpCode,
        });
      } else {
        deleteMeWithoutPasswordMutation.mutate();
      }
    })(e as unknown as BaseSyntheticEvent);
  };

  const handleDisconnectAccount = (values: ProfileSubmitValues) => {
    if (isCALIdentityProvider) return;
    if (user?.passwordAdded) {
      setTempFormValues(values);
      setShowDisconnectWarning(true);
      return;
    }
    setShowCreatePasswordDialog(true);
  };

  const handleResendVerifyEmail = (email: string) => {
    resendVerifyEmailMutation.mutate({ email });
    toastManager.add({ title: t("email_sent"), type: "success" });
  };

  return (
    <>
      <AppHeader>
        <AppHeaderContent title={t("profile")}>
          <AppHeaderDescription>
            {t("profile_description", { appName: APP_NAME })}
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>

      <div className="flex flex-col gap-4">
        <ProfileFormCard
          key={JSON.stringify(defaultValues)}
          defaultValues={defaultValues}
          isPending={updateProfileMutation.isPending}
          user={user}
          onSubmit={handleProfileSubmit}
          onAddEmail={() => setShowSecondaryEmailModal(true)}
          onResendVerifyEmail={handleResendVerifyEmail}
          onDisconnectAccount={handleDisconnectAccount}
          usernameField={
            <UsernameAvailabilityField
              onSuccessMutation={async () => {
                toastManager.add({
                  title: t("settings_updated_successfully"),
                  type: "success",
                });
                await utils.viewer.me.invalidate();
                revalidateSettingsProfile();
              }}
              onErrorMutation={() => {
                toastManager.add({
                  title: t("error_updating_settings"),
                  type: "error",
                });
              }}
            />
          }
          showConnectedAccounts={showConnectedAccounts}
          identityProvider={user.identityProvider}
          identityProviderEmail={user.identityProviderEmail}
          attributes={usersAttributes ?? undefined}
          originalSecondaryEmails={user.secondaryEmails}
        />

        {shouldShowCompanyEmailAlert && (
          <CompanyEmailOrganizationBanner
            onDismissAction={() => setIsCompanyEmailAlertDismissed(true)}
          />
        )}

        <ProfileDangerZone onDeleteAccount={() => setDeleteAccountOpen(true)} />
      </div>

      {/* Dialogs */}

      <DeleteAccountDialog
        ref={passwordRef}
        open={deleteAccountOpen}
        onOpenChange={setDeleteAccountOpen}
        onConfirm={handleDeleteConfirm}
        onTwoFactorSubmit={handleTwoFactorSubmit}
        isLoading={deleteMeMutation.isPending}
        showPasswordField={isCALIdentityProvider}
        showTwoFactor={!!user?.twoFactorEnabled && isCALIdentityProvider}
        errorMessage={hasDeleteErrors ? deleteErrorMessage : undefined}
      />

      <ConfirmPasswordDialog
        ref={passwordRef}
        open={confirmPasswordOpen}
        onOpenChange={setConfirmPasswordOpen}
        onConfirm={handleConfirmPassword}
        isLoading={confirmPasswordMutation.isPending}
        oldEmail={user.email ?? ""}
        newEmail={tempFormValues?.email}
        errorMessage={confirmPasswordErrorMessage || undefined}
      />

      <CreatePasswordDialog
        open={showCreatePasswordDialog}
        onOpenChange={setShowCreatePasswordDialog}
      />

      <DisconnectAccountDialog
        open={showDisconnectWarning}
        onOpenChange={setShowDisconnectWarning}
        onConfirm={() => {
          unlinkConnectedAccountMutation.mutate();
          setShowDisconnectWarning(false);
        }}
      />

      {showSecondaryEmailModal && (
        <SecondaryEmailModal
          isLoading={addSecondaryEmailMutation.isPending}
          errorMessage={secondaryEmailAddErrorMessage}
          handleAddEmail={(values) => {
            setSecondaryEmailAddErrorMessage("");
            addSecondaryEmailMutation.mutate(values);
          }}
          onCancel={() => {
            setSecondaryEmailAddErrorMessage("");
            setShowSecondaryEmailModal(false);
          }}
          clearErrorMessage={() => {
            addSecondaryEmailMutation.reset();
            setSecondaryEmailAddErrorMessage("");
          }}
        />
      )}

      {!!newlyAddedSecondaryEmail && (
        <SecondaryEmailConfirmModal
          email={newlyAddedSecondaryEmail}
          onCancel={() => setNewlyAddedSecondaryEmail(undefined)}
        />
      )}
    </>
  );
};

export default ProfileView;
