"use client";

import { usePathname, useRouter } from "next/navigation";

import { getParserWithGeneric } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

import LicenseRequired from "../../common/components/LicenseRequired";
import { UserForm } from "../components/UserForm";
import { userBodySchema } from "../schemas/userBodySchema";

const UsersAddView = () => {
  const pathname = usePathname();
  const router = useRouter();
  const utils = trpc.useUtils();
  const mutation = trpc.viewer.users.add.useMutation({
    onSuccess: async () => {
      showToast("User added successfully", "success");
      await utils.viewer.users.list.invalidate();

      if (pathname !== null) {
        router.replace(pathname.replace("/add", ""));
      }
    },
    onError: (err) => {
      console.error(err.message);
      showToast("There has been an error adding this user.", "error");
    },
  });
  return (
    <div>
      <LicenseRequired>
        <UserForm
          submitLabel="Add user"
          onSubmit={async (values) => {
            const parser = getParserWithGeneric(userBodySchema);
            const parsedValues = parser(values);
            mutation.mutate(parsedValues);
          }}
        />
      </LicenseRequired>
    </div>
  );
};

export default UsersAddView;
