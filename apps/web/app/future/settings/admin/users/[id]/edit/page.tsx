import { type Params } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { z } from "zod";

import Page from "@calcom/features/ee/users/pages/users-edit-view";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayoutAppDir";
import prisma from "@calcom/prisma";

const userIdSchema = z.object({ id: z.coerce.number() });

export const generateMetadata = async ({ params }: { params: Params }) => {
  const input = userIdSchema.safeParse(params);
  if (!input.success) {
    return await _generateMetadata(
      () => "",
      () => "Here you can edit a current user."
    );
  }

  const username = await prisma.user.findFirst({
    where: {
      id: input.data.id,
    },
    select: {
      username: true,
    },
  });

  return await _generateMetadata(
    () => `Editing user: ${username?.username}`,
    () => "Here you can edit a current user."
  );
};

export default WithLayout({ getLayout, Page })<"P">;
