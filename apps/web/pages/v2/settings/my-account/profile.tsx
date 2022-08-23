import crypto from "crypto";
import { GetServerSidePropsContext } from "next";
import { signOut } from "next-auth/react";
import { useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import Avatar from "@calcom/ui/v2/core/Avatar";
import { Button } from "@calcom/ui/v2/core/Button";
import { Dialog, DialogTrigger, DialogContent } from "@calcom/ui/v2/core/Dialog";
import { TextField, Form, Label } from "@calcom/ui/v2/core/form/fields";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";
import showToast from "@calcom/ui/v2/core/notfications";

import { getSession } from "@lib/auth";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import ImageUploader from "@components/v2/settings/ImageUploader";

// TODO show toast

const ProfileView = (props: inferSSRProps<typeof getServerSideProps>) => {
  const { t } = useLocale();

  const { user } = props;
  // const { data: user, isLoading } = trpc.useQuery(["viewer.me"]);
  const mutation = trpc.useMutation("viewer.updateProfile", {
    onSuccess: () => {
      showToast("Profile updated successfully", "success");
    },
    onError: () => {
      showToast("Error updating profile", "error");
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
                      // avatarRef.current.value = newAvatar;
                      // const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                      //   window.HTMLInputElement.prototype,
                      //   "value"
                      // )?.set;
                      // nativeInputValueSetter?.call(avatarRef.current, newAvatar);
                      // const ev2 = new Event("input", { bubbles: true });
                      // avatarRef.current.dispatchEvent(ev2);
                      // updateProfileHandler(ev2 as unknown as FormEvent<HTMLFormElement>);
                      // setImageSrc(newAvatar);
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
                label="My personal Cal URL"
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
                label="Full name"
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
                label="About"
                hint="A few sentences about yourself. this will appear on your personal url page."
                value={value}
                onChange={(e) => {
                  formMethods.setValue("bio", e?.target.value);
                }}
              />
            </div>
          )}
        />
        <Button color="primary" className="mt-8" type="submit" loading={mutation.isLoading}>
          Update
        </Button>

        <hr className="my-6 border-2 border-neutral-200" />

        <Label>Danger Zone</Label>
        {/* Delete account Dialog */}
        <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
          <DialogTrigger asChild>
            <Button color="destructive" className="mt-1 border-2" StartIcon={Icon.FiTrash2}>
              Delete account
            </Button>
          </DialogTrigger>
          <DialogContent
            title="Delete Account"
            description="Are you sure you want to delete your Cal.com account?"
            type="confirmation"
            actionText="Delete my account"
            Icon={Icon.FiAlertTriangle}
            actionOnClick={() => deleteAccount()}>
            {/* Use trans component for translation */}
            <p>
              Anyone who you ve shared your account link with will no longer be able to book using it and any
              preferences you have saved will be lost
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
