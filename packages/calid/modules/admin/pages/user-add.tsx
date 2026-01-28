"use client";

import { usePathname, useRouter } from "next/navigation";

import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

import { AdminUserForm, type AdminUserFormValues } from "../components/AdminUserForm";

const AdminUserAddPage = () => {
  const pathname = usePathname();
  const router = useRouter();
  const utils = trpc.useUtils();

  const mutation = trpc.viewer.admin.calid.users.add.useMutation({
    onSuccess: async () => {
      showToast("User added successfully", "success");
      await utils.viewer.admin.calid.users.list.invalidate();
      if (pathname) router.replace(pathname.replace("/add", ""));
    },
    onError: () => {
      showToast("There has been an error adding this user.", "error");
    },
  });

  const handleSubmit = (values: AdminUserFormValues) => {
    mutation.mutate(values);
  };

  return <AdminUserForm submitLabel="Add user" onSubmit={handleSubmit} />;
};

export default AdminUserAddPage;
