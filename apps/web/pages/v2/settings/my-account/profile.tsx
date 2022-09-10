import crypto from "crypto";
import { GetServerSidePropsContext } from "next";
import { signOut } from "next-auth/react";
import { useRef, useState, BaseSyntheticEvent } from "react";
import { Controller, useForm } from "react-hook-form";

import { ErrorCode, getSession } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { TRPCClientErrorLike } from "@calcom/trpc/client";
import { trpc } from "@calcom/trpc/react";
import { AppRouter } from "@calcom/trpc/server/routers/_app";
import { Icon } from "@calcom/ui";
import { Alert } from "@calcom/ui/Alert";
import Avatar from "@calcom/ui/v2/core/Avatar";
import { Button } from "@calcom/ui/v2/core/Button";
import { Dialog, DialogContent, DialogTrigger } from "@calcom/ui/v2/core/Dialog";
import Meta from "@calcom/ui/v2/core/Meta";
import { Form, Label, TextField, PasswordField } from "@calcom/ui/v2/core/form/fields";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";
import showToast from "@calcom/ui/v2/core/notifications";

import { inferSSRProps } from "@lib/types/inferSSRProps";

import TwoFactor from "@components/auth/TwoFactor";
import ImageUploader from "@components/v2/settings/ImageUploader";

interface DeleteAccountValues {
  totpCode: string;
}

const ProfileView = (props: inferSSRProps<typeof getServerSideProps>) => {
  const { t } = useLocale();
  const utils = trpc.useContext();

  const { user } = props;
  // const { data: user, isLoading } = trpc.useQuery(["viewer.me"]);
  const mutation = trpc.useMutation("viewer.updateProfile", {
    onSuccess: () => {
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [hasDeleteErrors, setHasDeleteErrors] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");

  const form = useForm<DeleteAccountValues>();

  const onDeleteMeSuccessMutation = async () => {
    await utils.invalidateQueries(["viewer.me"]);
    showToast(t("Your account was deleted"), "success");

    setHasDeleteErrors(false); // dismiss any open errors
    if (process.env.NEXT_PUBLIC_WEBAPP_URL === "https://app.cal.com") {
      signOut({ callbackUrl: "/auth/logout?survey=true" });
    } else {
      signOut({ callbackUrl: "/auth/logout" });
    }
  };

  const onDeleteMeErrorMutation = (error: TRPCClientErrorLike<AppRouter>) => {
    setHasDeleteErrors(true);
    setDeleteErrorMessage(errorMessages[error.message]);
  };
  const deleteMeMutation = trpc.useMutation("viewer.deleteMe", {
    onSuccess: onDeleteMeSuccessMutation,
    onError: onDeleteMeErrorMutation,
    async onSettled() {
      await utils.invalidateQueries(["viewer.me"]);
    },
  });

  const onConfirmButton = (e: Event | React.MouseEvent<HTMLElement, MouseEvent>) => {
    e.preventDefault();
    const totpCode = form.getValues("totpCode");
    const password = passwordRef.current.value;
    deleteMeMutation.mutate({ password, totpCode });
  };
  const onConfirm = ({ totpCode }: DeleteAccountValues, e: BaseSyntheticEvent | undefined) => {
    e?.preventDefault();
    const password = passwordRef.current.value;
    deleteMeMutation.mutate({ password, totpCode });
  };

  const formMethods = useForm({
    defaultValues: {
      avatar: user.avatar || "",
      username: user?.username || "",
      name: user?.name || "",
      bio: user?.bio || "",
    },
  });

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

  return (
    <>
      <Form
        form={formMethods}
        handleSubmit={(values) => {
          mutation.mutate(values);
        }}>
        <Meta title="profile" description="profile_description" />
        <div className="flex items-center">
          {/* TODO upload new avatar */}
          <Controller
            control={formMethods.control}
            name="avatar"
            render={({ field: { value } }) => (
              <>
                <Avatar alt="" imageSrc={value} gravatarFallbackMd5={user.emailMd5} size="lg" />
                <div className="ml-4">
                  <ImageUploader
                    target="avatar"
                    id="avatar-upload"
                    buttonMsg={t("change_avatar")}
                    handleAvatarChange={(newAvatar) => {
                      formMethods.setValue("avatar", newAvatar);
                    }}
                    imageSrc={value}
                  />
                </div>
              </>
            )}
          />
        </div>
        <Controller
          control={formMethods.control}
          name="username"
          render={({ field: { value } }) => (
            <div className="mt-8">
              <TextField
                name="username"
                label={t("personal_cal_url")}
                addOnLeading="https://"
                value={value}
                onChange={(e) => {
                  formMethods.setValue("username", e?.target.value);
                }}
              />
            </div>
          )}
        />
        <Controller
          control={formMethods.control}
          name="name"
          render={({ field: { value } }) => (
            <div className="mt-8">
              <TextField
                name="username"
                label={t("full_name")}
                value={value}
                onChange={(e) => {
                  formMethods.setValue("name", e?.target.value);
                }}
              />
            </div>
          )}
        />
        <Controller
          control={formMethods.control}
          name="bio"
          render={({ field: { value } }) => (
            <div className="mt-8">
              <TextField
                name="bio"
                label={t("about")}
                hint={t("bio_hint")}
                value={value}
                onChange={(e) => {
                  formMethods.setValue("bio", e?.target.value);
                }}
              />
            </div>
          )}
        />
        <Button color="primary" className="mt-8" type="submit" loading={mutation.isLoading}>
          {t("update")}
        </Button>

        <hr className="my-6  border-neutral-200" />

        <Label>{t("danger_zone")}</Label>
        {/* Delete account Dialog */}
        <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
          <DialogTrigger asChild>
            <Button color="destructive" className="mt-1 border-2" StartIcon={Icon.FiTrash2}>
              {t("delete_account")}
            </Button>
          </DialogTrigger>
          <DialogContent
            title={t("delete_account_modal_title")}
            description={t("confirm_delete_account_modal")}
            type="creation"
            actionText={t("delete_my_account")}
            Icon={Icon.FiAlertTriangle}
            actionOnClick={(e) => e && onConfirmButton(e)}>
            <>
              <p className="mb-7">{t("delete_account_confirmation_message")}</p>
              <PasswordField
                data-testid="password"
                name="password"
                id="password"
                type="password"
                autoComplete="current-password"
                required
                label="Password"
                ref={passwordRef}
              />

              {user.twoFactorEnabled && (
                <Form handleSubmit={onConfirm} className="pb-4" form={form}>
                  <TwoFactor center={false} />
                </Form>
              )}

              {hasDeleteErrors && <Alert severity="error" title={deleteErrorMessage} />}
            </>
          </DialogContent>
        </Dialog>
      </Form>
    </>
  );
};

ProfileView.getLayout = getLayout;

export default ProfileView;

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
      id: true,
      username: true,
      email: true,
      name: true,
      bio: true,
      avatar: true,
      twoFactorEnabled: true,
    },
  });

  if (!user) {
    throw new Error("User seems logged in but cannot be found in the db");
  }

  return {
    props: {
      user: {
        ...user,
        emailMd5: crypto.createHash("md5").update(user.email).digest("hex"),
      },
    },
  };
};
