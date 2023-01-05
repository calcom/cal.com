import { IdentityProvider } from "@prisma/client";
import crypto from "crypto";
import { GetServerSidePropsContext } from "next";
import { signOut } from "next-auth/react";
import { BaseSyntheticEvent, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { ErrorCode } from "@calcom/lib/auth";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TRPCClientErrorLike } from "@calcom/trpc/client";
import { trpc } from "@calcom/trpc/react";
import { AppRouter } from "@calcom/trpc/server/routers/_app";
import {
  Alert,
  Avatar,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  Form,
  Icon,
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

import TwoFactor from "@components/auth/TwoFactor";
import { UsernameAvailabilityField } from "@components/ui/UsernameAvailability";

import { ssrInit } from "@server/lib/ssr";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} />
      <div className="mt-6 mb-8 space-y-6 divide-y">
        <div className="flex items-center">
          <SkeletonAvatar className=" h-12 w-12 px-4" />
          <SkeletonButton className=" h-6 w-32 rounded-md p-5" />
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
  const { data: user, isLoading } = trpc.viewer.me.useQuery();
  const { data: avatar, isLoading: isLoadingAvatar } = trpc.viewer.avatar.useQuery();
  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: () => {
      showToast(t("settings_updated_successfully"), "success");
      utils.viewer.me.invalidate();
      utils.viewer.avatar.invalidate();
      setTempFormValues(null);
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);
  const [tempFormValues, setTempFormValues] = useState<FormValues | null>(null);
  const [confirmPasswordErrorMessage, setConfirmPasswordDeleteErrorMessage] = useState("");

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
      if (tempFormValues) mutation.mutate(tempFormValues);
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

  const isCALIdentityProviver = user?.identityProvider === IdentityProvider.CAL;

  const onConfirmPassword = (e: Event | React.MouseEvent<HTMLElement, MouseEvent>) => {
    e.preventDefault();

    const password = passwordRef.current.value;
    confirmPasswordMutation.mutate({ passwordInput: password });
  };

  const onConfirmButton = (e: Event | React.MouseEvent<HTMLElement, MouseEvent>) => {
    e.preventDefault();
    if (isCALIdentityProviver) {
      const totpCode = form.getValues("totpCode");
      const password = passwordRef.current.value;
      deleteMeMutation.mutate({ password, totpCode });
    } else {
      deleteMeWithoutPasswordMutation.mutate();
    }
  };

  const onConfirm = ({ totpCode }: DeleteAccountValues, e: BaseSyntheticEvent | undefined) => {
    e?.preventDefault();
    if (isCALIdentityProviver) {
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

  if (isLoading || !user || isLoadingAvatar || !avatar)
    return <SkeletonLoader title={t("profile")} description={t("profile_description")} />;

  const defaultValues = {
    username: user.username || "",
    avatar: avatar.avatar || "",
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
        onSubmit={(values) => {
          if (values.email !== user.email && isCALIdentityProviver) {
            setTempFormValues(values);
            setConfirmPasswordOpen(true);
          } else {
            mutation.mutate(values);
          }
        }}
        extraField={
          <div className="mt-8">
            <UsernameAvailabilityField
              user={user}
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

      <hr className="my-6  border-neutral-200" />

      <Label>{t("danger_zone")}</Label>
      {/* Delete account Dialog */}
      <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <DialogTrigger asChild>
          <Button
            data-testid="delete-account"
            color="destructive"
            className="mt-1 border-2"
            StartIcon={Icon.FiTrash2}>
            {t("delete_account")}
          </Button>
        </DialogTrigger>
        <DialogContent
          title={t("delete_account_modal_title")}
          description={t("confirm_delete_account_modal", { appName: APP_NAME })}
          type="creation"
          Icon={Icon.FiAlertTriangle}>
          <>
            <p className="mb-7">{t("delete_account_confirmation_message", { appName: APP_NAME })}</p>
            {isCALIdentityProviver && (
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

            {user?.twoFactorEnabled && isCALIdentityProviver && (
              <Form handleSubmit={onConfirm} className="pb-4" form={form}>
                <TwoFactor center={false} />
              </Form>
            )}

            {hasDeleteErrors && <Alert severity="error" title={deleteErrorMessage} />}
            <DialogFooter>
              <Button
                color="primary"
                data-testid="delete-account-confirm"
                onClick={(e) => onConfirmButton(e)}>
                {t("delete_my_account")}
              </Button>
              <DialogClose />
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
          Icon={Icon.FiAlertTriangle}>
          <>
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
            <DialogFooter>
              <Button color="primary" onClick={(e) => onConfirmPassword(e)}>
                {t("confirm")}
              </Button>
              <DialogClose />
            </DialogFooter>
          </>
        </DialogContent>
      </Dialog>
    </>
  );
};

const ProfileForm = ({
  defaultValues,
  onSubmit,
  extraField,
}: {
  defaultValues: FormValues;
  onSubmit: (values: FormValues) => void;
  extraField?: React.ReactNode;
}) => {
  const { t } = useLocale();
  const emailMd5 = crypto
    .createHash("md5")
    .update(defaultValues.email || "example@example.com")
    .digest("hex");

  const formMethods = useForm<FormValues>({
    defaultValues,
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
              <Avatar alt="" imageSrc={value} gravatarFallbackMd5={emailMd5} size="lg" />
              <div className="ltr:ml-4 rtl:mr-4">
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
        <TextField label={t("about")} hint={t("bio_hint")} {...formMethods.register("bio")} />
      </div>

      <Button disabled={isDisabled} color="primary" className="mt-8" type="submit">
        {t("update")}
      </Button>
    </Form>
  );
};

ProfileView.getLayout = getLayout;

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};

export default ProfileView;
