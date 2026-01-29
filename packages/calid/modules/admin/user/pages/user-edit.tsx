"use client";

import { triggerToast } from "@calid/features/ui/components/toast";
import { usePathname, useRouter, useParams } from "next/navigation";
import { z } from "zod";

import { trpc } from "@calcom/trpc/react";

import { AdminUserForm, type AdminUserFormValues } from "../components/AdminUserForm";

const userIdSchema = z.object({ id: z.coerce.number() });

const AdminUserEditPage = () => {
  const params = useParams();
  const parsed = userIdSchema.safeParse(params);

  if (!parsed.success) return <div>Invalid input</div>;

  const { data, isLoading } = trpc.viewer.admin.calid.users.get.useQuery({ userId: parsed.data.id });

  if (isLoading) return <div>Loading...</div>;
  if (!data?.user) return <div>User not found</div>;

  const userForForm: AdminUserFormValues & { id: number } = {
    id: data.user.id,
    avatarUrl: data.user.avatarUrl ?? null,
    name: data.user.name ?? "",
    username: data.user.username ?? "",
    email: data.user.email ?? "",
    bio: data.user.bio ?? "",
    locale: data.user.locale ?? "en",
    timeZone: data.user.timeZone ?? "",
    timeFormat: data.user.timeFormat ?? 12,
    weekStart: data.user.weekStart ?? "Monday",
    role: data.user.role ?? "USER",
    identityProvider: data.user.identityProvider ?? "CAL",
  };

  return <AdminUserEditView user={userForForm} />;
};

const AdminUserEditView = ({ user }: { user: AdminUserFormValues & { id: number } }) => {
  const pathname = usePathname();
  const router = useRouter();
  const utils = trpc.useUtils();

  const mutation = trpc.viewer.admin.calid.users.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.viewer.admin.calid.users.list.invalidate(),
        utils.viewer.admin.calid.users.get.invalidate(),
      ]);
      triggerToast("User updated successfully", "success");
      const base = pathname?.split("/users/")[0];
      if (base) router.replace(`${base}/users`);
    },
    onError: () => {
      triggerToast("There has been an error updating this user.", "error");
    },
  });

  const handleSubmit = (values: AdminUserFormValues) => {
    const payload: Partial<AdminUserFormValues & { userId: number }> = {
      userId: user.id,
      ...values,
    };

    if (user.username === values.username) delete payload.username;

    mutation.mutate(payload);
  };

  return <AdminUserForm defaultValues={user} onSubmit={handleSubmit} />;
};

export default AdminUserEditPage;
