"use client";

import { usePathname, useRouter } from "next/navigation";
import { z } from "zod";

import NoSSR from "@calcom/lib/components/NoSSR";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { getParserWithGeneric } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

import LicenseRequired from "../../common/components/LicenseRequired";
import { UserForm } from "../components/UserForm";
import { userBodySchema } from "../schemas/userBodySchema";
import type { UserAdminRouterOutputs } from "../server/trpc-router";

type User = UserAdminRouterOutputs["get"]["user"];
const userIdSchema = z.object({ id: z.coerce.number() });

const UsersEditPage = () => {
  const params = useParamsWithFallback();
  const input = userIdSchema.safeParse(params);

  if (!input.success) return <div>Invalid input</div>;

  const [data] = trpc.viewer.users.get.useSuspenseQuery({ userId: input.data.id });
  const { user } = data;

  return (
    <LicenseRequired>
      <NoSSR>
        <UsersEditView user={user} />
      </NoSSR>
    </LicenseRequired>
  );
};

export const UsersEditView = ({ user }: { user: User }) => {
  const pathname = usePathname();
  const router = useRouter();

  const utils = trpc.useUtils();
  const mutation = trpc.viewer.users.update.useMutation({
    onSuccess: async () => {
      Promise.all([utils.viewer.users.list.invalidate(), utils.viewer.users.get.invalidate()]);
      showToast("User updated successfully", "success");
      router.replace(`${pathname?.split("/users/")[0]}/users`);
    },
    onError: (err) => {
      console.error(err.message);
      showToast("There has been an error updating this user.", "error");
    },
  });
  return (
    <UserForm
      key={JSON.stringify(user)}
      onSubmit={(values) => {
        const parser = getParserWithGeneric(userBodySchema);
        const parsedValues = parser(values);
        const data: Partial<typeof parsedValues & { userId: number }> = {
          ...parsedValues,
          userId: user.id,
        };
        // Don't send username if it's the same as the current one
        if (user.username === data.username) delete data.username;
        mutation.mutate(data);
      }}
      defaultValues={user}
    />
  );
};

export default UsersEditView;
