import { useRouter } from "next/router";

import { getParserWithGeneric } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import { Meta, showToast } from "@calcom/ui";

import { getLayout } from "../../../settings/layouts/SettingsLayout";
import LicenseRequired from "../../common/components/v2/LicenseRequired";
import { UserForm } from "../components/UserForm";
import { userBodySchema } from "../schemas/userBodySchema";

const UsersAddView = () => {
  const router = useRouter();
  const utils = trpc.useContext();
  const mutation = trpc.viewer.users.add.useMutation({
    onSuccess: async () => {
      showToast("User added successfully", "success");
      await utils.viewer.users.list.invalidate();
      router.replace(router.asPath.replace("/add", ""));
    },
    onError: (err) => {
      console.error(err.message);
      showToast("There has been an error adding this user.", "error");
    },
  });
  return (
    <LicenseRequired>
      <Meta title="Add new user" description="Here you can add a new user." />
      <UserForm
        submitLabel="Add user"
        onSubmit={async (values) => {
          const parser = getParserWithGeneric(userBodySchema);
          const parsedValues = parser(values);
          mutation.mutate(parsedValues);
        }}
      />
    </LicenseRequired>
  );
};

UsersAddView.getLayout = getLayout;

export default UsersAddView;
