import { useForm, Controller } from "react-hook-form";

import { trpc } from "@calcom/trpc/react";
import Avatar from "@calcom/ui/v2/core/Avatar";
import { Button } from "@calcom/ui/v2/core/Button";
import Loader from "@calcom/ui/v2/core/Loader";
import { TextField, Form } from "@calcom/ui/v2/core/form/fields";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";

// TODO show toast

function ProfileView() {
  const { data: user, isLoading } = trpc.useQuery(["viewer.me"]);
  const mutation = trpc.useMutation("viewer.updateProfile");

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
        <Button color="primary" className="ml-4">
          Update
        </Button>
      </Form>
    </>
  );
}

ProfileView.getLayout = getLayout;

export default ProfileView;
