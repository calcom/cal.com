import crypto from "crypto";
import { GetServerSidePropsContext } from "next";
import { signOut } from "next-auth/react";
import { Trans } from "next-i18next";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import Avatar from "@calcom/ui/v2/core/Avatar";
import { Button } from "@calcom/ui/v2/core/Button";
import { Dialog, DialogContent, DialogTrigger } from "@calcom/ui/v2/core/Dialog";
import Meta from "@calcom/ui/v2/core/Meta";
import { Form, Label, TextField } from "@calcom/ui/v2/core/form/fields";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";
import showToast from "@calcom/ui/v2/core/notifications";

import { getSession } from "@lib/auth";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import ImageUploader from "@components/v2/settings/ImageUploader";

const ProfileView = (props: inferSSRProps<typeof getServerSideProps>) => {
  const { t } = useLocale();

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

  const deleteAccount = async () => {
    await fetch("/api/user/me", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    }).catch((e) => {
      console.error(`Error Removing user: ${user?.id}, email: ${user?.email} :`, e);
    });
    if (process.env.NEXT_PUBLIC_WEBAPP_URL === "https://app.cal.com") {
      signOut({ callbackUrl: "/auth/logout?survey=true" });
    } else {
      signOut({ callbackUrl: "/auth/logout" });
    }
  };

  const formMethods = useForm({
    defaultValues: {
      avatar: user.avatar || "",
      username: user?.username || "",
      name: user?.name || "",
      bio: user?.bio || "",
    },
  });

  const avatarRef = useRef<HTMLInputElement>(null!);

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

        <hr className="my-6 border-2 border-neutral-200" />

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
            type="confirmation"
            actionText={t("delete_my_account")}
            Icon={Icon.FiAlertTriangle}
            actionOnClick={() => deleteAccount()}>
            {/* Use trans component for translation */}
            <p>
              <Trans i18nKey="delete_account_warning">
                Anyone who you have shared your account link with will no longer be able to book using it and
                any preferences you have saved will be lost
              </Trans>
            </p>
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
