import { signOut } from "next-auth/react";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";

import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import Avatar from "@calcom/ui/v2/core/Avatar";
import { Button } from "@calcom/ui/v2/core/Button";
import { Dialog, DialogTrigger, DialogContent } from "@calcom/ui/v2/core/Dialog";
import Loader from "@calcom/ui/v2/core/Loader";
import { TextField, Form, Label } from "@calcom/ui/v2/core/form/fields";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";
import showToast from "@calcom/ui/v2/core/notfications";

// TODO show toast

function ProfileView() {
  const { data: user, isLoading } = trpc.useQuery(["viewer.me"]);
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
      username: user?.username || "",
      name: user?.name || "",
      bio: user?.bio || "",
    },
  });

  if (isLoading) return <Loader />;

  return (
    <>
      <Form
        form={formMethods}
        handleSubmit={(values) => {
          mutation.mutate(values);
        }}>
        <div className="flex items-center">
          {/* TODO upload new avatar */}
          <Avatar alt="" imageSrc={user?.avatar} size="lg" />
          <Button color="secondary" className="ml-4">
            Replace
          </Button>
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
}

ProfileView.getLayout = getLayout;

export default ProfileView;
