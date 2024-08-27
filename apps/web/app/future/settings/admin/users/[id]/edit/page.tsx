import { type Params } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { redirect } from "next/navigation";
import { z } from "zod";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { UsersEditView } from "@calcom/features/ee/users/pages/users-edit-view";
import { UserRepository } from "@calcom/lib/server/repository/user";

const userIdSchema = z.object({ id: z.coerce.number() });

export const generateMetadata = async ({ params }: { params: Params }) => {
  const input = userIdSchema.safeParse(params);
  if (!input.success) {
    return await _generateMetadata(
      () => "",
      () => "Here you can edit a current user."
    );
  }

  const user = await UserRepository.adminFindById(input.data.id);

  return await _generateMetadata(
    () => `Editing user: ${user.username}`,
    () => "Here you can edit a current user."
  );
};

const Page = async ({ params }: { params: Params }) => {
  const input = userIdSchema.safeParse(params);

  if (!input.success) {
    redirect("/404");
  }

  try {
    const user = await UserRepository.adminFindById(input.data.id);

    return (
      <LicenseRequired>
        <UsersEditView user={user} />
      </LicenseRequired>
    );
  } catch {
    redirect("/404");
  }
};

export default Page;
