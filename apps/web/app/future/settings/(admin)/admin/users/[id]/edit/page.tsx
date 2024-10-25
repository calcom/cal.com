import { type Params } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { notFound } from "next/navigation";
import { z } from "zod";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { UsersEditView } from "@calcom/features/ee/users/pages/users-edit-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { UserRepository } from "@calcom/lib/server/repository/user";

const userIdSchema = z.object({ id: z.coerce.number() });

export const generateMetadata = async (props: { params: Promise<Params> }) => {
  const params = await props.params;
  const input = userIdSchema.safeParse(params);
  if (!input.success) {
    return await _generateMetadata(
      () => `Editing user`,
      () => "Here you can edit a current user."
    );
  }

  const user = await UserRepository.adminFindById(input.data.id);

  return await _generateMetadata(
    () => `Editing user: ${user.username}`,
    () => "Here you can edit a current user."
  );
};

const Page = async (props: { params: Promise<Params> }) => {
  const params = await props.params;
  const input = userIdSchema.safeParse(params);

  if (!input.success) {
    notFound();
  }

  try {
    const user = await UserRepository.adminFindById(input.data.id);

    return (
      <SettingsHeader title="Editing user" description="Here you can edit a current user">
        <LicenseRequired>
          <UsersEditView user={user} />
        </LicenseRequired>
      </SettingsHeader>
    );
  } catch {
    notFound();
  }
};

export default Page;
