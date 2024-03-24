"use client";

import { zodResolver } from "@hookform/resolvers/zod";
// eslint-disable-next-line no-restricted-imports
import { pick, get } from "lodash";
import { signOut, useSession } from "next-auth/react";
import type { BaseSyntheticEvent } from "react";
import React, { useRef, useState } from "react";
import { Controller, useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { APP_NAME, FULL_NAME_LENGTH_MAX_LIMIT } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import turndown from "@calcom/lib/turndownService";
import { IdentityProvider } from "@calcom/prisma/enums";
import type { TRPCClientErrorLike } from "@calcom/trpc/client";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";
import type { Ensure } from "@calcom/types/utils";
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
  UserAvatar,
} from "@calcom/ui";
import { AlertTriangle, Trash2, Plus } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";
import TwoFactor from "@components/auth/TwoFactor";
import CustomEmailTextField from "@components/settings/CustomEmailTextField";
import SecondaryEmailConfirmModal from "@components/settings/SecondaryEmailConfirmModal";
import SecondaryEmailModal from "@components/settings/SecondaryEmailModal";
import { UsernameAvailabilityField } from "@components/ui/UsernameAvailability";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} borderInShellHeader={true} />
      <div className="border-subtle space-y-6 rounded-b-lg border border-t-0 px-4 py-8">
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

type Email = {
  id: number;
  email: string;
  emailVerified: string | null;
  emailPrimary: boolean;
};

export type FormValues = {
  username: string;
  avatar: string;
  name: string;
  email: string;
  bio: string;
  secondaryEmails: Email[];
};

const ProfileView = () => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { update } = useSession();
  const { data: user, isPending } = trpc.viewer.me.useQuery();

  const { data: avatarData } = trpc.viewer.avatar.useQuery(undefined, {
    enabled: !isPending && !user?.avatarUrl,
  });

  const updateProfileMutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: async (res) => {
      await update(res);
      // signout user only in case of password reset
      if (res.signOutUser && tempFormValues && res.passwordReset) {
        showToast(t("password_reset_email", { email: tempFormValues.email }), "success");
        await signOut({ callbackUrl: "/auth/logout?passReset=true" });
      } else {
        utils.viewer.me.invalidate();
        utils.viewer.avatar.invalidate();
        utils.viewer.shouldVerifyEmail.invalidate();
      }

      if (res.hasEmailBeenChanged && res.sendEmailVerification) {
        showToast(t("change_of_email_toast", { email: tempFormValues?.email }), "success");
      } else {
        showToast(t("settings_updated_successfully"), "success");
      }

      setConfirmAuthEmailChangeWarningDialogOpen(false);
      setTempFormValues(null);
    },
    onError: (e) => {
      switch (e.message) {
        // TODO: Add error codes.
        case "email_already_used":
          {
            showToast(t(e.message), "error");
          }
          return;
        default:
          showToast(t("error_updating_settings"), "error");
      }
    },
  });

  const addSecondaryEmailMutation = trpc.viewer.addSecondaryEmail.useMutation({
    onSuccess: (res) => {
      setShowSecondaryEmailModalOpen(false);
      setNewlyAddedSecondaryEmail(res?.data?.email);
      utils.viewer.me.invalidate();
    },
    onError: (error) => {
      setSecondaryEmailAddErrorMessage(error?.message || "");
    },
  });

  const resendVerifyEmailMutation = trpc.viewer.auth.resendVerifyEmail.useMutation();

  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);
  const [tempFormValues, setTempFormValues] = useState<ExtendedFormValues | null>(null);
  const [confirmPasswordErrorMessage, setConfirmPasswordDeleteErrorMessage] = useState("");
  const [confirmAuthEmailChangeWarningDialogOpen, setConfirmAuthEmailChangeWarningDialogOpen] =
    useState(false);
  const [showSecondaryEmailModalOpen, setShowSecondaryEmailModalOpen] = useState(false);
  const [secondaryEmailAddErrorMessage, setSecondaryEmailAddErrorMessage] = useState("");
  const [newlyAddedSecondaryEmail, setNewlyAddedSecondaryEmail] = useState<undefined | string>(undefined);

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

  if (isPending || !user) {
    return (
      <SkeletonLoader title={t("profile")} description={t("profile_description", { appName: APP_NAME })} />
    );
  }

  const userEmail = user.email || "";
  const defaultValues = {
    username: user.username || "",
    avatar: getUserAvatarUrl({
      ...user,
      profile: user.profile,
    }),
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
  };

  return (
    <>
      <Meta
        title={t("profile")}
        description={t("profile_description", { appName: APP_NAME })}
        borderInShellHeader={true}
      />
      <ProfileForm
        key={JSON.stringify(defaultValues)}
        defaultValues={defaultValues}
        isPending={updateProfileMutation.isPending}
        isFallbackImg={!user.avatarUrl && !avatarData?.avatar}
        user={user}
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
        handleAddSecondaryEmail={() => setShowSecondaryEmailModalOpen(true)}
        handleResendVerifyEmail={(email) => {
          resendVerifyEmailMutation.mutate({ email });
          showToast(t("email_sent"), "success");
        }}
        extraField={
          <div className="mt-6">
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

      <div className="border-subtle mt-6 rounded-lg rounded-b-none border border-b-0 p-6">
        <Label className="mb-0 text-base font-semibold text-red-700">{t("danger_zone")}</Label>
        <p className="text-subtle text-sm">{t("account_deletion_cannot_be_undone")}</p>
      </div>
      {/* Delete account Dialog */}
      <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <SectionBottomActions align="end">
          <DialogTrigger asChild>
            <Button data-testid="delete-account" color="destructive" className="mt-1" StartIcon={Trash2}>
              {t("delete_account")}
            </Button>
          </DialogTrigger>
        </SectionBottomActions>
        <DialogContent
          title={t("delete_account_modal_title")}
          description={t("confirm_delete_account_modal", { appName: APP_NAME })}
          type="creation"
          Icon={AlertTriangle}>
          <>
            <div className="mb-10">
              <p className="text-default mb-4">{t("delete_account_confirmation_message")}</p>
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
          <DialogFooter showDivider>
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
              loading={updateProfileMutation.isPending}
              onClick={(e) => onConfirmAuthEmailChange(e)}>
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
    </>
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
  extraField,
  isPending = false,
  isFallbackImg,
  user,
  userOrganization,
}: {
  defaultValues: FormValues;
  onSubmit: (values: ExtendedFormValues) => void;
  handleAddSecondaryEmail: () => void;
  handleResendVerifyEmail: (email: string) => void;
  extraField?: React.ReactNode;
  isPending: boolean;
  isFallbackImg: boolean;
  user: RouterOutputs["viewer"]["me"];
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
    secondaryEmails: z.array(
      z.object({
        id: z.number(),
        email: z.string().email(),
        emailVerified: z.union([z.string(), z.null()]).optional(),
        emailPrimary: z.boolean().optional(),
      })
    ),
  });

  const formMethods = useForm<FormValues>({
    defaultValues,
    resolver: zodResolver(profileFormSchema),
  });

  const {
    fields: secondaryEmailFields,
    remove: deleteSecondaryEmail,
    replace: updateAllSecondaryEmailFields,
  } = useFieldArray({
    control: formMethods.control,
    name: "secondaryEmails",
    keyName: "itemId",
  });

  const handleFormSubmit = (values: FormValues) => {
    const changedFields = formMethods.formState.dirtyFields?.secondaryEmails || [];
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
    onSubmit({
      ...updatedValues,
      secondaryEmails,
    });
  };

  const {
    formState: { isSubmitting, isDirty },
  } = formMethods;

  const isDisabled = isSubmitting || !isDirty;
  return (
    <Form form={formMethods} handleSubmit={handleFormSubmit}>
      <div className="border-subtle border-x px-4 pb-10 pt-8 sm:px-6">
        <div className="flex items-center">
          <Controller
            control={formMethods.control}
            name="avatar"
            render={({ field: { value } }) => {
              const showRemoveAvatarButton = value === null ? false : !isFallbackImg;
              const organization =
                userOrganization && userOrganization.id
                  ? {
                      ...(userOrganization as Ensure<NonNullable<typeof user.organization>, "id">),
                      slug: userOrganization.slug || null,
                      requestedSlug: userOrganization.metadata?.requestedSlug || null,
                    }
                  : null;
              return (
                <>
                  <UserAvatar data-testid="profile-upload-avatar" previewSrc={value} size="lg" user={user} />
                  <div className="ms-4">
                    <h2 className="mb-2 text-sm font-medium">{t("profile_picture")}</h2>
                    <div className="flex gap-2">
                      <ImageUploader
                        target="avatar"
                        id="avatar-upload"
                        buttonMsg={t("upload_avatar")}
                        handleAvatarChange={(newAvatar) => {
                          formMethods.setValue("avatar", newAvatar, { shouldDirty: true });
                        }}
                        imageSrc={value}
                        triggerButtonColor={showRemoveAvatarButton ? "secondary" : "primary"}
                      />

                      {showRemoveAvatarButton && (
                        <Button
                          color="secondary"
                          onClick={() => {
                            formMethods.setValue("avatar", "", { shouldDirty: true });
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
        {extraField}
        <div className="mt-6">
          <TextField label={t("full_name")} {...formMethods.register("name")} />
        </div>
        <div className="mt-6">
          <Label>{t("email")}</Label>
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
          <div className="text-default mt-2 flex items-center text-sm">{t("change_email_hint")}</div>
          <Button
            color="minimal"
            StartIcon={Plus}
            className="mt-2"
            onClick={() => handleAddSecondaryEmail()}
            data-testid="add-secondary-email">
            {t("add_email")}
          </Button>
        </div>
        <div className="mt-6">
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
      </div>
      <SectionBottomActions align="end">
        <Button
          loading={isPending}
          disabled={isDisabled}
          color="primary"
          type="submit"
          data-testid="profile-submit-button">
          {t("update")}
        </Button>
      </SectionBottomActions>
    </Form>
  );
};

ProfileView.getLayout = getLayout;
ProfileView.PageWrapper = PageWrapper;

export default ProfileView;
