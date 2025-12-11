"use client";

import { Avatar } from "@calid/features/ui/components/avatar";
import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@calid/features/ui/components/dialog";
import { Form, FormField } from "@calid/features/ui/components/form";
import { Checkbox } from "@calid/features/ui/components/input/checkbox-field";
import { TextField } from "@calid/features/ui/components/input/input";
import { PasswordField } from "@calid/features/ui/components/input/input";
import {
  usePhoneNumberField,
  PhoneNumberField,
  isPhoneNumberComplete,
  isStrictlyValidNumber,
} from "@calid/features/ui/components/input/phone-number-field";
import { Label } from "@calid/features/ui/components/label";
import { triggerToast } from "@calid/features/ui/components/toast";
import { CustomBannerUploader } from "@calid/features/ui/components/uploader";
import { zodResolver } from "@hookform/resolvers/zod";
import { revalidateSettingsProfile } from "app/cache/path/settings/my-account";
// eslint-disable-next-line no-restricted-imports
import { get, pick } from "lodash";
import { signOut, useSession } from "next-auth/react";
import type { BaseSyntheticEvent } from "react";
import React, { useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { DisplayInfo } from "@calcom/features/users/components/UserTable/EditSheet/DisplayInfo";
import {
  APP_NAME,
  FULL_NAME_LENGTH_MAX_LIMIT,
  PHONE_NUMBER_VERIFICATION_ENABLED,
} from "@calcom/lib/constants";
import { getPlaceholderHeader } from "@calcom/lib/defaultHeaderImage";
import { emailSchema } from "@calcom/lib/emailSchema";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import turndown from "@calcom/lib/turndownService";
import { IdentityProvider } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/types/server/routers/_app";
import { Alert } from "@calcom/ui/components/alert";
import { Editor } from "@calcom/ui/components/editor";
import { ImageUploader } from "@calcom/ui/components/image-uploader";

import TwoFactor from "@components/auth/TwoFactor";
import CustomEmailTextField from "@components/settings/CustomEmailTextField";
import SecondaryEmailConfirmModal from "@components/settings/SecondaryEmailConfirmModal";
import SecondaryEmailModal from "@components/settings/SecondaryEmailModal";
import { UsernameAvailabilityField } from "@components/ui/UsernameAvailability";

import type { TRPCClientErrorLike } from "@trpc/client";

interface DeleteAccountValues {
  totpCode: string;
}

type Email = {
  id: number;
  email: string;
  emailVerified: string | null;
  emailPrimary: boolean;
};

export type FormValues = {
  username: string;
  avatarUrl: string | null;
  name: string;
  email: string;
  bio: string;
  secondaryEmails: Email[];
  metadata?: {
    phoneNumber?: string;
    usePhoneForWhatsApp?: boolean;
    headerUrl?: string | null;
  };
};

type Props = {
  user: RouterOutputs["viewer"]["me"]["calid_get"];
};

const ProfileView = ({ user }: Props) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { update } = useSession();
  const updateProfileMutation = trpc.viewer.me.calid_updateProfile.useMutation({
    onSuccess: async (res) => {
      await update(res);
      utils.viewer.me.invalidate();
      utils.viewer.me.shouldVerifyEmail.invalidate();
      revalidateSettingsProfile();

      if (res.hasEmailBeenChanged && res.sendEmailVerification) {
        triggerToast(t("change_of_email_toast", { email: tempFormValues?.email }), "success");
      } else {
        triggerToast(t("settings_updated_successfully"), "success");
      }

      setTempFormValues(null);
    },
    onError: (e) => {
      switch (e.message) {
        // TODO: Add error codes.
        case "email_already_used":
          {
            triggerToast(t(e.message), "error");
          }
          return;
        default:
          triggerToast(t("error_updating_settings"), "error");
      }
    },
  });
  const unlinkConnectedAccountMutation = trpc.viewer.loggedInViewerRouter.unlinkConnectedAccount.useMutation({
    onSuccess: async (res) => {
      triggerToast(t(res.message), "success");
      utils.viewer.me.invalidate();
      revalidateSettingsProfile();
    },
    onError: (e) => {
      triggerToast(t(e.message), "error");
    },
  });

  const addSecondaryEmailMutation = trpc.viewer.loggedInViewerRouter.addSecondaryEmail.useMutation({
    onSuccess: (res) => {
      setShowSecondaryEmailModalOpen(false);
      setNewlyAddedSecondaryEmail(res?.data?.email);
      utils.viewer.me.invalidate();
      revalidateSettingsProfile();
    },
    onError: (error) => {
      setSecondaryEmailAddErrorMessage(error?.message || "");
    },
  });

  const resendVerifyEmailMutation = trpc.viewer.auth.resendVerifyEmail.useMutation();

  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);
  const [tempFormValues, setTempFormValues] = useState<ExtendedFormValues | null>(null);
  const [confirmPasswordErrorMessage, setConfirmPasswordDeleteErrorMessage] = useState("");
  const [showCreateAccountPasswordDialog, setShowCreateAccountPasswordDialog] = useState(false);
  const [showAccountDisconnectWarning, setShowAccountDisconnectWarning] = useState(false);
  const [showSecondaryEmailModalOpen, setShowSecondaryEmailModalOpen] = useState(false);
  const [secondaryEmailAddErrorMessage, setSecondaryEmailAddErrorMessage] = useState("");
  const [newlyAddedSecondaryEmail, setNewlyAddedSecondaryEmail] = useState<undefined | string>(undefined);

  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [hasDeleteErrors, setHasDeleteErrors] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
  const form = useForm<DeleteAccountValues>();

  const onDeleteMeSuccessMutation = async () => {
    await utils.viewer.me.invalidate();
    revalidateSettingsProfile();

    triggerToast(t("Your account was deleted"), "success");

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
  const deleteMeMutation = trpc.viewer.me.deleteMe.useMutation({
    onSuccess: onDeleteMeSuccessMutation,
    onError: onDeleteMeErrorMutation,
    async onSettled() {
      await utils.viewer.me.invalidate();
      revalidateSettingsProfile();
    },
  });
  const deleteMeWithoutPasswordMutation = trpc.viewer.me.deleteMeWithoutPassword.useMutation({
    onSuccess: onDeleteMeSuccessMutation,
    onError: onDeleteMeErrorMutation,
    async onSettled() {
      await utils.viewer.me.invalidate();
      revalidateSettingsProfile();
    },
  });

  const isCALIdentityProvider = user?.identityProvider === IdentityProvider.CAL;

  const onConfirmPassword = (e: Event | React.MouseEvent<HTMLElement, MouseEvent>) => {
    e.preventDefault();

    const password = passwordRef.current.value;
    confirmPasswordMutation.mutate({ passwordInput: password });
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

    window.dataLayer = window.dataLayer || [];

    const gtmEvent = {
      event: "user_deletion_success",
      email: user.email,
      username: user.username,
    };

    window.dataLayer.push(gtmEvent);
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

  const userEmail = user.email || "";
  const defaultValues = {
    username: user.username || "",
    avatarUrl: user.avatarUrl,
    name: user.name || "",
    email: userEmail,
    bio: user.bio || "",
    // We add the primary email as the first item in the list
    secondaryEmails: [
      {
        id: 0,
        email: userEmail,
        emailVerified: user.emailVerified?.toString() || null,
        emailPrimary: true,
      },
      ...(user.secondaryEmails || []).map((secondaryEmail) => ({
        ...secondaryEmail,
        emailVerified: secondaryEmail.emailVerified?.toString() || null,
        emailPrimary: false,
      })),
    ],

    metadata: {
      phoneNumber: (isPrismaObjOrUndefined(user.metadata)?.phoneNumber as string) ?? "",
      usePhoneForWhatsApp: (isPrismaObjOrUndefined(user.metadata)?.usePhoneForWhatsApp as boolean) ?? false,
      headerUrl: (isPrismaObjOrUndefined(user.metadata)?.headerUrl as string | null) ?? null,
    },
  };

  return (
    <SettingsHeader
      title={t("profile")}
      description={t("profile_description", { appName: APP_NAME })}
      borderInShellHeader={false}>
      <ProfileForm
        key={JSON.stringify(defaultValues)}
        defaultValues={defaultValues}
        isPending={updateProfileMutation.isPending}
        isFallbackImg={!user.avatarUrl}
        user={user}
        userOrganization={user.organization}
        onSubmit={(values) => {
          if (values.email !== user.email && isCALIdentityProvider) {
            setTempFormValues(values);
            setConfirmPasswordOpen(true);
          } else {
            updateProfileMutation.mutate(values);
          }
        }}
        handleAddSecondaryEmail={() => setShowSecondaryEmailModalOpen(true)}
        handleResendVerifyEmail={(email) => {
          resendVerifyEmailMutation.mutate({ email });
          triggerToast(t("email_sent"), "success");
        }}
        handleAccountDisconnect={(values) => {
          if (isCALIdentityProvider) return;
          if (user?.passwordAdded) {
            setTempFormValues(values);
            setShowAccountDisconnectWarning(true);
            return;
          }
          setShowCreateAccountPasswordDialog(true);
        }}
        extraField={<></>}
        isCALIdentityProvider={isCALIdentityProvider}
      />

      <div className="bg-cal-destructive-dim border-destructive mb-2 mt-6 rounded-md border p-6">
        <Label className="text-destructive mb-1 text-base font-semibold">{t("danger_zone")}</Label>
        <p className="text-subtle mb-1 text-sm">{t("account_deletion_cannot_be_undone")}</p>

        <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
          <DialogTrigger asChild>
            <Button
              data-testid="delete-account"
              variant="button"
              color="destructive"
              className="bg-default text-destructive"
              StartIcon="trash-2">
              {t("delete_account")}
            </Button>
          </DialogTrigger>
          <DialogContent
            title={t("delete_account_modal_title")}
            description={t("confirm_delete_account_modal", { appName: APP_NAME })}
            type="creation"
            Icon="triangle-alert">
            <>
              <div className="mb-10">
                <p className="text-subtle mb-4 text-sm">{t("delete_account_confirmation_message")}</p>
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
                  <Form onSubmit={onConfirm} className="pb-4" form={form}>
                    <TwoFactor center={false} />
                  </Form>
                )}

                {hasDeleteErrors && <Alert severity="error" title={deleteErrorMessage} />}
              </div>
              <DialogFooter>
                <DialogClose />
                <Button
                  color="primary"
                  data-testid="delete-account-confirm"
                  onClick={(e) => onConfirmButton(e)}
                  loading={deleteMeMutation.isPending}>
                  {t("delete_my_account")}
                </Button>
              </DialogFooter>
            </>
          </DialogContent>
        </Dialog>
      </div>
      {/* Delete account Dialog */}

      {/* If changing email, confirm password */}
      <Dialog open={confirmPasswordOpen} onOpenChange={setConfirmPasswordOpen}>
        <DialogContent
          title={t("confirm_password")}
          description={t("confirm_password_change_email")}
          type="creation"
          Icon="triangle-alert">
          <div className="mb-10">
            <div className="mb-4 grid gap-2 md:grid-cols-2">
              <div>
                <span className="text-emphasis mb-2 block text-sm font-medium leading-none">
                  {t("old_email_address")}
                </span>
                <p className="text-subtle leading-none">{user.email}</p>
              </div>
              <div>
                <span className="text-emphasis mb-2 block text-sm font-medium leading-none">
                  {t("new_email_address")}
                </span>
                <p className="text-subtle leading-none">{tempFormValues?.email}</p>
              </div>
            </div>
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
          <DialogFooter>
            <Button
              data-testid="profile-update-email-submit-button"
              color="primary"
              loading={confirmPasswordMutation.isPending}
              onClick={(e) => onConfirmPassword(e)}>
              {t("confirm")}
            </Button>
            <DialogClose />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateAccountPasswordDialog} onOpenChange={setShowCreateAccountPasswordDialog}>
        <DialogContent
          title={t("create_account_password")}
          description={t("create_account_password_hint")}
          type="creation"
          Icon="triangle-alert">
          <DialogFooter>
            <DialogClose />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAccountDisconnectWarning} onOpenChange={setShowAccountDisconnectWarning}>
        <DialogContent
          title={t("disconnect_account")}
          description={t("disconnect_account_hint")}
          type="creation"
          Icon="triangle-alert">
          <DialogFooter>
            <Button
              color="primary"
              onClick={() => {
                unlinkConnectedAccountMutation.mutate();
                setShowAccountDisconnectWarning(false);
              }}>
              {t("confirm")}
            </Button>
            <DialogClose />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showSecondaryEmailModalOpen && (
        <SecondaryEmailModal
          isLoading={addSecondaryEmailMutation.isPending}
          errorMessage={secondaryEmailAddErrorMessage}
          handleAddEmail={(values) => {
            setSecondaryEmailAddErrorMessage("");
            addSecondaryEmailMutation.mutate(values);
          }}
          onCancel={() => {
            setSecondaryEmailAddErrorMessage("");
            setShowSecondaryEmailModalOpen(false);
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
    </SettingsHeader>
  );
};

type SecondaryEmailApiPayload = {
  id: number;
  email: string;
  isDeleted: boolean;
};

type ExtendedFormValues = Omit<FormValues, "secondaryEmails"> & {
  secondaryEmails: SecondaryEmailApiPayload[];
};

const ProfileForm = ({
  defaultValues,
  onSubmit,
  handleAddSecondaryEmail,
  handleResendVerifyEmail,
  handleAccountDisconnect,
  extraField,
  isPending = false,
  isFallbackImg: _isFallbackImg,
  user,
  userOrganization: _userOrganization,
  isCALIdentityProvider,
}: {
  defaultValues: FormValues;
  onSubmit: (values: ExtendedFormValues) => void;
  handleAddSecondaryEmail: () => void;
  handleResendVerifyEmail: (email: string) => void;
  handleAccountDisconnect: (values: ExtendedFormValues) => void;
  extraField?: React.ReactNode;
  isPending: boolean;
  isFallbackImg: boolean;
  user: RouterOutputs["viewer"]["me"]["calid_get"];
  userOrganization: RouterOutputs["viewer"]["me"]["calid_get"]["organization"] | null;
  isCALIdentityProvider: boolean;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [firstRender, setFirstRender] = useState(true);

  const profileFormSchema = z.object({
    username: z.string(),
    avatarUrl: z.string().nullable(),
    name: z
      .string()
      .trim()
      .min(1, t("you_need_to_add_a_name"))
      .max(FULL_NAME_LENGTH_MAX_LIMIT, {
        message: t("max_limit_allowed_hint", { limit: FULL_NAME_LENGTH_MAX_LIMIT }),
      }),
    email: emailSchema,
    bio: z.string(),
    secondaryEmails: z.array(
      z.object({
        id: z.number(),
        email: emailSchema,
        emailVerified: z.union([z.string(), z.null()]).optional(),
        emailPrimary: z.boolean().optional(),
      })
    ),
    metadata: z
      .object({
        phoneNumber: z
          .string()
          .refine(
            (val) => {
              // return val === "" || isValidPhoneNumber(val);
              return val === "" || isStrictlyValidNumber(val);
            },
            { message: t("invalid_phone_number") }
          )
          .optional(),
        usePhoneForWhatsApp: z.boolean().optional(),
        headerUrl: z.union([z.string(), z.null()]).optional(),
      })
      .optional(),
  });

  const formMethods = useForm<FormValues>({
    defaultValues,
    resolver: zodResolver(profileFormSchema),
  });

  const phoneFieldHelpers = usePhoneNumberField(
    {
      getValues: formMethods.getValues,
      setValue: formMethods.setValue,
    },
    defaultValues,
    "metadata.phoneNumber"
  );

  const handleDeleteNumber = () => {
    phoneFieldHelpers.setValue("", { shouldDirty: true });
    const values = formMethods.getValues();
    onSubmit(getUpdatedFormValues(values));
  };

  const [uploadingBanner, setUploadingBanner] = useState(false);

  const updateBannerMutation = trpc.viewer.me.calid_updateProfile.useMutation({
    onSuccess: async (res) => {
      setUploadingBanner(false);
      utils.viewer.me.invalidate();
      revalidateSettingsProfile();
      triggerToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      setUploadingBanner(false);
      triggerToast(t("error_updating_settings"), "error");
    },
  });

  const handleBannerUpdate = async (newHeaderUrl: string | null) => {
      setUploadingBanner(true);
    updateBannerMutation.mutate({
      username: user.username || "",
      avatarUrl: user.avatarUrl,
      name: user.name || "",
      email: user.email || "",
      bio: user.bio || "",
      secondaryEmails: [],
      metadata: {
        ...isPrismaObjOrUndefined(user.metadata),
        headerUrl: newHeaderUrl,
      },
    });
  };

  const {
    fields: secondaryEmailFields,
    remove: deleteSecondaryEmail,
    replace: updateAllSecondaryEmailFields,
  } = useFieldArray({
    control: formMethods.control,
    name: "secondaryEmails",
    keyName: "itemId",
  });

  const getUpdatedFormValues = (values: FormValues) => {
    const changedFields = (formMethods.formState.dirtyFields as any)?.secondaryEmails || [];
    const updatedValues: FormValues = {
      ...values,
    };

    // If the primary email is changed, we will need to update
    const primaryEmailIndex = updatedValues.secondaryEmails.findIndex(
      (secondaryEmail) => secondaryEmail.emailPrimary
    );
    if (primaryEmailIndex >= 0) {
      // Add the new updated value as primary email
      updatedValues.email = updatedValues.secondaryEmails[primaryEmailIndex].email;
    }

    // We will only send the emails which have already changed
    const updatedEmails: Email[] = [];
    changedFields.map((field, index) => {
      // If the email changed and if its only secondary email, we add it for updation, the first
      // item in the list is always primary email
      if (field?.email && updatedValues.secondaryEmails[index]?.id) {
        updatedEmails.push(updatedValues.secondaryEmails[index]);
      }
    });

    const deletedEmails = (user?.secondaryEmails || []).filter(
      (secondaryEmail) => !updatedValues.secondaryEmails.find((val) => val.id && val.id === secondaryEmail.id)
    );
    const secondaryEmails = [
      ...updatedEmails.map((email) => ({ ...email, isDeleted: false })),
      ...deletedEmails.map((email) => ({ ...email, isDeleted: true })),
    ].map((secondaryEmail) => pick(secondaryEmail, ["id", "email", "isDeleted"]));

    return {
      ...updatedValues,
      secondaryEmails,
    };
  };

  const handleFormSubmit = (values: FormValues) => {
    const phoneNumber = values.metadata?.phoneNumber || "";
    const isPhoneValid = isPhoneNumberComplete(phoneNumber, PHONE_NUMBER_VERIFICATION_ENABLED); // Assuming verification is required

    if (
      formMethods.formState.dirtyFields.metadata &&
      (formMethods.formState.dirtyFields.metadata as any)?.phoneNumber === true &&
      phoneNumber &&
      !isPhoneValid
    ) {
      triggerToast(t("please_verify_phone_number"), "error");
      return;
    }

    const finalValues = getUpdatedFormValues(values);
    onSubmit(finalValues);
  };

  const onDisconnect = () => {
    handleAccountDisconnect(getUpdatedFormValues(formMethods.getValues()));
  };

  const { data: usersAttributes, isPending: _usersAttributesPending } =
    trpc.viewer.attributes.calid_getByUserId.useQuery({
      userId: user.id,
    });

  const {
    formState: { isSubmitting, isDirty },
  } = formMethods;

  const isDisabled = isSubmitting || !isDirty;

  const bioValue = formMethods.watch("bio") || "";

  const getText = React.useCallback(() => bioValue, [bioValue]);

  // Watch phone number to conditionally show WhatsApp checkbox
  const phoneNumber = formMethods.watch("metadata.phoneNumber");
  const hasPhoneNumber = phoneNumber && phoneNumber.trim() !== "";

  return (
    <div>
      <Form form={formMethods} onSubmit={handleFormSubmit}>
        <div className="border-default rounded-md border px-4 py-6 sm:px-6">
          <h2 className="mb-2 text-sm font-medium">{t("profile_picture")}</h2>
          <div className="flex items-center">
            <FormField
              control={formMethods.control}
              name="avatarUrl"
              render={({ field: { value, onChange } }) => {
                const showRemoveAvatarButton = value !== null;
                return (
                  <>
                    <Avatar
                      data-testid="profile-upload-avatar"
                      imageSrc={getUserAvatarUrl({ avatarUrl: value })}
                      size="lg"
                      alt={user.name || "Nameless User"}
                    />
                    <div className="ms-4">
                      <div className="flex gap-2">
                        <ImageUploader
                          target="avatar"
                          id="avatar-upload"
                          buttonMsg={t("upload_avatar")}
                          handleAvatarChange={(newAvatar) => {
                            onChange(newAvatar);
                          }}
                          buttonSize="lg"
                          imageSrc={getUserAvatarUrl({ avatarUrl: value })}
                          triggerButtonColor={showRemoveAvatarButton ? "secondary" : "secondary"}
                        />

                        {showRemoveAvatarButton && (
                          <Button
                            color="destructive"
                            onClick={() => {
                              onChange(null);
                            }}>
                            {t("remove")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                );
              }}
            />
          </div>
          {/* {extraField} */}

          <div className="mt-6">
            <UsernameAvailabilityField
              control={formMethods.control}
              onSuccessMutation={async () => {
                triggerToast(t("settings_updated_successfully"), "success");
                await utils.viewer.me.invalidate();
                revalidateSettingsProfile();
              }}
              onErrorMutation={() => {
                triggerToast(t("error_updating_settings"), "error");
              }}
            />
          </div>

          <div className="mt-6">
            <TextField label={t("full_name")} {...formMethods.register("name")} />
          </div>
          <div className="mt-6">
            <Label>{t("email")}</Label>
            <div className="-mt-2 flex flex-wrap items-start gap-2">
              <div className={secondaryEmailFields.length > 1 ? "grid w-full" : "flex-1"}>
                {secondaryEmailFields.map((field, index) => (
                  <CustomEmailTextField
                    key={field.itemId}
                    formMethods={formMethods}
                    formMethodFieldName={`secondaryEmails.${index}.email` as keyof FormValues}
                    errorMessage={get(formMethods.formState.errors, `secondaryEmails.${index}.email.message`)}
                    emailVerified={Boolean(field.emailVerified)}
                    emailPrimary={field.emailPrimary}
                    dataTestId={`profile-form-email-${index}`}
                    handleChangePrimary={() => {
                      const fields = secondaryEmailFields.map((secondaryField, cIndex) => ({
                        ...secondaryField,
                        emailPrimary: cIndex === index,
                      }));
                      updateAllSecondaryEmailFields(fields);
                    }}
                    handleVerifyEmail={() => handleResendVerifyEmail(field.email)}
                    handleItemDelete={() => deleteSecondaryEmail(index)}
                  />
                ))}
              </div>
              <Button
                color="secondary"
                StartIcon="plus"
                size="lg"
                className="mt-2 h-[40px]"
                onClick={() => handleAddSecondaryEmail()}
                data-testid="add-secondary-email">
                {t("add_email")}
              </Button>
            </div>
          </div>

          <div className="mt-6">
            <PhoneNumberField
              getValue={phoneFieldHelpers.getValue}
              setValue={phoneFieldHelpers.setValue}
              getValues={formMethods.getValues}
              defaultValues={defaultValues}
              isRequired={false}
              allowDelete={true}
              hasExistingNumber={!!defaultValues.metadata.phoneNumber}
              isNumberVerificationRequired={PHONE_NUMBER_VERIFICATION_ENABLED} // Only require OTP when phone is mandatory
              errorMessage={formMethods.formState.errors.metadata?.phoneNumber?.message}
              onDeleteNumber={handleDeleteNumber}
              fieldName="metadata.phoneNumber"
            />
          </div>

          {hasPhoneNumber && (
            <div className="mt-4">
              <FormField
                control={formMethods.control}
                name="metadata.usePhoneForWhatsApp"
                render={({ field: { value, onChange } }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={value ?? false}
                      onCheckedChange={(checked) => onChange(!!checked)}
                      id="usePhoneForWhatsApp"
                    />
                    <label
                      htmlFor="usePhoneForWhatsApp"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {t("use_this_phone_number_for_whatsapp") || "Use this phone number for WhatsApp?"}
                    </label>
                  </div>
                )}
              />
            </div>
          )}

          <div className="mt-6">
            <Label>{t("about")}</Label>
            <Editor
              getText={getText}
              setText={(value: string) => {
                formMethods.setValue("bio", turndown(value), { shouldDirty: true });
              }}
              excludedToolbarItems={["blockType"]}
              disableLists
              firstRender={firstRender}
              setFirstRender={setFirstRender}
              height="120px"
            />
          </div>

          {usersAttributes && usersAttributes?.length > 0 && (
            <div className="mt-6 flex flex-col">
              <Label>{t("attributes")}</Label>
              <div className="flex flex-col space-y-4">
                {usersAttributes.map((attribute, index) => (
                  <>
                    <DisplayInfo
                      key={index}
                      label={attribute.name}
                      labelClassname="font-normal text-sm text-subtle"
                      valueClassname="text-emphasis inline-flex items-center gap-1 font-normal text-sm leading-5"
                      value={
                        ["TEXT", "NUMBER", "SINGLE_SELECT"].includes(attribute.type)
                          ? attribute.options[0].value
                          : attribute.options.map((option) => option.value)
                      }
                    />
                  </>
                ))}
              </div>
            </div>
          )}
          {/* // For Non-Cal identities, we merge the values from DB and the user logging in,
        so essentially there's no point in allowing them to disconnect, since when they log in they will get logged into the same account */}
          {!isCALIdentityProvider && user.email !== user.identityProviderEmail && (
            <div className="mt-6">
              <Label>Connected accounts</Label>
              <div className="flex items-center">
                <span className="text-default text-sm capitalize">{user.identityProvider.toLowerCase()}</span>
                {user.identityProviderEmail && (
                  <span className="text-default ml-2 text-sm">{user.identityProviderEmail}</span>
                )}
                <div className="flex flex-1 justify-end">
                  <Button color="destructive" onClick={onDisconnect}>
                    {t("disconnect")}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <Button
            loading={isPending}
            disabled={isDisabled}
            color="primary"
            className="mt-4"
            type="submit"
            data-testid="profile-submit-button">
            {t("update")}
          </Button>
        </div>
      </Form>
      <div className="border-default mt-6 rounded-md border px-4 py-6 sm:px-6">
        <BannerUploaderForm
          banner={(isPrismaObjOrUndefined(user.metadata)?.headerUrl as string | null) ?? null}
          handleFormSubmit={handleBannerUpdate}
          uploadingBanner={uploadingBanner}
        />
      </div>
    </div>
  );
};

const BannerUploaderForm = ({
  banner,
  handleFormSubmit,
uploadingBanner
}: {
  banner: string | null;
  handleFormSubmit: (newHeaderUrl: string | null) => {} | Promise;
uploadingBanner: boolean;
}) => {
  const { t } = useLocale();

  const showRemoveHeaderButton = banner !== null;

  return (
    <div className="flex flex-col">
      <Label>{t("booking_page_banner")}</Label>
      <span className="text-subtle mb-4 text-sm">{t("booking_page_banner_description")}</span>
      <div className="bg-muted mb-4 flex aspect-[10/1] w-full items-center justify-start overflow-hidden rounded-lg">
        {!banner ? (
          <div className="bg-cal-gradient dark:bg-cal-gradient h-full w-full" />
        ) : (
          <img className="h-full w-full object-cover" src={banner} alt="Header background" />
        )}
      </div>

      <div className="flex gap-2">
        <CustomBannerUploader
          target="metadata.headerUrl"
          id="header-upload"
          buttonMsg={t("upload_image")}
          uploading={uploadingBanner}
          fieldName="Banner"
          mimeType={["image/svg+xml", "image/png"]}
          height={320}
          width={3200}
          handleAvatarChange={async (newHeaderUrl) => {
            await handleFormSubmit(newHeaderUrl);
          }}
          imageSrc={getPlaceholderHeader(banner, banner) ?? undefined}
          triggerButtonColor={showRemoveHeaderButton ? "secondary" : "primary"}
        />
        {showRemoveHeaderButton && (
          <Button
            color="secondary"
            onClick={() => {
              handleFormSubmit(null);
            }}>
            {t("remove")}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProfileView;
