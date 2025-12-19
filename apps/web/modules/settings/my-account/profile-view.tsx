"use client";

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
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { isCompanyEmail } from "@calcom/features/ee/organizations/lib/utils";
import { DisplayInfo } from "@calcom/features/users/components/UserTable/EditSheet/DisplayInfo";
import { APP_NAME, FULL_NAME_LENGTH_MAX_LIMIT } from "@calcom/lib/constants";
import { emailSchema } from "@calcom/lib/emailSchema";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import turndown from "@calcom/lib/turndownService";
import { IdentityProvider } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/types/server/routers/_app";
import { Alert } from "@calcom/ui/components/alert";
import { UserAvatar } from "@calcom/ui/components/avatar";
import { Button } from "@coss/ui/components/button";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Fieldset, FieldsetLegend } from "@coss/ui/components/fieldset";
import { Input } from "@coss/ui/components/input";
import { Spinner } from "@coss/ui/components/spinner";
import { Frame, FramePanel, FrameFooter, FrameHeader, FrameTitle, FrameDescription } from "@coss/ui/components/frame";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@coss/ui/components/input-group";
import { Toggle } from "@coss/ui/components/toggle";
import { DialogContent, DialogFooter, DialogTrigger, DialogClose } from "@calcom/ui/components/dialog";
import { Editor } from "@calcom/ui/components/editor";
import { Form } from "@calcom/ui/components/form";
import { PasswordField } from "@calcom/ui/components/form";
import { Label } from "@coss/ui/components/label";
import { Icon } from "@calcom/ui/components/icon";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { showToast } from "@calcom/ui/components/toast";
import { BoldIcon, ItalicIcon, LinkIcon } from "lucide-react";

import TwoFactor from "@components/auth/TwoFactor";
import CustomEmailTextField from "@components/settings/CustomEmailTextField";
import SecondaryEmailConfirmModal from "@components/settings/SecondaryEmailConfirmModal";
import SecondaryEmailModal from "@components/settings/SecondaryEmailModal";
import { UsernameAvailabilityField } from "@components/ui/UsernameAvailability";

import type { TRPCClientErrorLike } from "@trpc/client";

import { CompanyEmailOrganizationBanner } from "./components/CompanyEmailOrganizationBanner";

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
};
type Props = {
  user: RouterOutputs["viewer"]["me"]["get"];
};

const ProfileView = ({ user }: Props) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const session = useSession();
  const { update } = session;
  const updateProfileMutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async (res) => {
      await update(res);
      utils.viewer.me.invalidate();
      utils.viewer.me.shouldVerifyEmail.invalidate();
      revalidateSettingsProfile();

      if (res.hasEmailBeenChanged && res.sendEmailVerification) {
        showToast(t("change_of_email_toast", { email: tempFormValues?.email }), "success");
      } else {
        showToast(t("settings_updated_successfully"), "success");
      }

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
  const unlinkConnectedAccountMutation = trpc.viewer.loggedInViewerRouter.unlinkConnectedAccount.useMutation({
    onSuccess: async (res) => {
      showToast(t(res.message), "success");
      utils.viewer.me.invalidate();
      revalidateSettingsProfile();
    },
    onError: (e) => {
      showToast(t(e.message), "error");
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
  const [isCompanyEmailAlertDismissed, setIsCompanyEmailAlertDismissed] = useState(false);
  const form = useForm<DeleteAccountValues>();

  const onDeleteMeSuccessMutation = async () => {
    await utils.viewer.me.invalidate();
    revalidateSettingsProfile();

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
  };

  // Check if user should see company email alert
  const shouldShowCompanyEmailAlert =
    !isCompanyEmailAlertDismissed &&
    !session.data?.user?.org?.id &&
    !user.organization?.id &&
    userEmail &&
    isCompanyEmail(userEmail);

  return (
    <>
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
          showToast(t("email_sent"), "success");
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
        extraField={
          <div className="mt-6">
            <UsernameAvailabilityField
              onSuccessMutation={async () => {
                showToast(t("settings_updated_successfully"), "success");
                await utils.viewer.me.invalidate();
                revalidateSettingsProfile();
              }}
              onErrorMutation={() => {
                showToast(t("error_updating_settings"), "error");
              }}
            />
          </div>
        }
        isCALIdentityProvider={isCALIdentityProvider}
      />

      {shouldShowCompanyEmailAlert && (
        <div className="my-6">
          <CompanyEmailOrganizationBanner onDismissAction={() => setIsCompanyEmailAlertDismissed(true)} />
        </div>
      )}

      <Frame>
        <FramePanel>
          <FrameTitle className="text-destructive-foreground">{t("danger_zone")}</FrameTitle>
          <FrameDescription>{t("account_deletion_cannot_be_undone")}</FrameDescription>
        </FramePanel>
        <FrameFooter className="flex-row justify-end">
        {/* Delete account Dialog */}
        <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
          <DialogTrigger asChild>
            <Button data-testid="delete-account" variant="destructive-outline">
              <Icon name="trash" />
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
                  <Form handleSubmit={onConfirm} className="pb-4" form={form}>
                    <TwoFactor center={false} />
                  </Form>
                )}

                {hasDeleteErrors && <Alert severity="error" title={deleteErrorMessage} />}
              </div>
              <DialogFooter showDivider>
                <DialogClose />
                <Button
                  variant="destructive"
                  data-testid="delete-account-confirm"
                  onClick={(e) => onConfirmButton(e)}
                  disabled={deleteMeMutation.isPending}>
                  {deleteMeMutation.isPending && <Spinner />}
                  <span className={deleteMeMutation.isPending ? "invisible" : ""}>{t("delete_my_account")}</span>
                </Button>
              </DialogFooter>
            </>
          </DialogContent>
        </Dialog>
        </FrameFooter>
      </Frame>      

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
          <DialogFooter showDivider>
            <Button
              data-testid="profile-update-email-submit-button"
              variant="default"
              disabled={confirmPasswordMutation.isPending}
              onClick={(e) => onConfirmPassword(e)}>
              {confirmPasswordMutation.isPending && <Spinner />}
              <span className={confirmPasswordMutation.isPending ? "invisible" : ""}>{t("confirm")}</span>
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
              variant="default"
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
  handleAccountDisconnect,
  extraField,
  isPending = false,
  isFallbackImg,
  user,
  userOrganization,
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
  user: RouterOutputs["viewer"]["me"]["get"];
  userOrganization: RouterOutputs["viewer"]["me"]["get"]["organization"];
  isCALIdentityProvider: boolean;
}) => {
  const { t } = useLocale();
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
    email: emailSchema.toLowerCase(),
    bio: z.string(),
    secondaryEmails: z.array(
      z.object({
        id: z.number(),
        email: emailSchema.toLowerCase(),
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

  const getUpdatedFormValues = (values: FormValues) => {
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

    return {
      ...updatedValues,
      secondaryEmails,
    };
  };

  const handleFormSubmit = (values: FormValues) => {
    onSubmit(getUpdatedFormValues(values));
  };

  const onDisconnect = () => {
    handleAccountDisconnect(getUpdatedFormValues(formMethods.getValues()));
  };

  const { data: usersAttributes, isPending: usersAttributesPending } =
    trpc.viewer.attributes.getByUserId.useQuery({
      userId: user.id,
    });

  const {
    formState: { isSubmitting, isDirty },
  } = formMethods;

  const isDisabled = isSubmitting || !isDirty;
  return (
    <Form form={formMethods} handleSubmit={handleFormSubmit}>
      <Frame>
        <FrameHeader>
          <FrameTitle className="text-base">{t("profile")}</FrameTitle>
          <FrameDescription>{t("profile_description", { appName: APP_NAME })}</FrameDescription>
        </FrameHeader>
        <FramePanel>

          {/* Profile Picture */}
          <div className="flex items-center">
            <Controller
              control={formMethods.control}
              name="avatarUrl"
              render={({ field: { value, onChange } }) => {
                const showRemoveAvatarButton = value !== null;
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
                          buttonSize="sm"
                          handleAvatarChange={(newAvatar) => {
                            onChange(newAvatar);
                          }}
                          imageSrc={getUserAvatarUrl({ avatarUrl: value })}
                        />

                        {showRemoveAvatarButton && (
                          <Button
                            variant="destructive-outline"
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

          {/* Extra Field */}
          {extraField}

          {/* Full Name */}
          <div className="mt-6">
            <Field>
              <FieldLabel>{t("full_name")}</FieldLabel>
              <Input type="text" {...formMethods.register("name")} />
            </Field>
          </div>

          {/* Email */}
          <div className="mt-6">
            <Fieldset className="w-full max-w-none gap-2">
              <Label className="font-normal" render={<FieldsetLegend />}>{t("email")}</Label>
              <div className="flex items-start gap-2">
              <div className="flex flex-1 flex-col gap-2">
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
                variant="outline"
                onClick={() => handleAddSecondaryEmail()}
                data-testid="add-secondary-email">
                <Icon name="plus" className="-ms-0.5" />
                {t("add_email")}
              </Button>
            </div>
            </Fieldset>
          </div>

          {/* About - original code */}
          {/* <div className="mt-6">
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
              height="120px"
            />
          </div>
          {usersAttributes && usersAttributes?.length > 0 && (
            <div className="mt-6 flex flex-col">
              <Label>{t("attributes")}</Label>
              <div className="flex flex-col stack-y-4">
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
          )} */}

          {/* About - Non-working code - UI only */}
          <div className="mt-6">
            <Field>
              <FieldLabel>{t("about")}</FieldLabel>
              <InputGroup>
                <InputGroupTextarea placeholder="Tell us about yourself…" />
                <InputGroupAddon align="block-start" className="bg-muted/50 border-b gap-1 p-2! rounded-t-lg">
                  <Toggle aria-label="Toggle bold" size="sm">
                    <BoldIcon />
                  </Toggle>
                  <Toggle aria-label="Toggle italic" size="sm">
                    <ItalicIcon />
                  </Toggle>
                  <Button aria-label="Link" size="icon-sm" variant="ghost">
                    <LinkIcon />
                  </Button>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </div>

          {/* // For Non-Cal identities, we merge the values from DB and the user logging in,
          so essentially there's no point in allowing them to disconnect, since when they log in they will get logged into the same account */}
          {!isCALIdentityProvider && user.email !== user.identityProviderEmail && (
            <div className="mt-6">
              <Label className="font-normal" render={<FieldsetLegend />}>Connected accounts</Label>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm capitalize">{user.identityProvider.toLowerCase()}</span>
                {user.identityProviderEmail && (
                  <span className="ml-2 text-sm">{user.identityProviderEmail}</span>
                )}
                <div className="flex flex-1 justify-end">
                  <Button variant="destructive-outline" onClick={onDisconnect}>
                    {t("disconnect")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </FramePanel>

        <FrameFooter className="flex-row justify-end">
          <Button
            disabled={isPending || isDisabled}
            variant="default"
            type="submit"
            data-testid="profile-submit-button">
            {isPending && <Spinner />}
            <span className={isPending ? "invisible" : ""}>{t("update")}</span>
          </Button>
        </FrameFooter>
      </Frame>
    </Form>
  );
};

export default ProfileView;
