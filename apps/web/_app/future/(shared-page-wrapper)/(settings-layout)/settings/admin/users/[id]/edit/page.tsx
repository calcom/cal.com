import { getServerCaller } from "_app/_trpc/serverClient";
import { type Params } from "_app/_types";
import { _generateMetadata } from "_app/_utils";
import { cookies, headers } from "next/headers";
import { z } from "zod";

import Page from "@calcom/features/ee/users/pages/users-edit-view";
import prisma from "@calcom/prisma";

const userIdSchema = z.object({ id: z.coerce.number() });

export const generateMetadata = async ({ params }: { params: Params }) => {
  const input = userIdSchema.safeParse(params);

  let title = "";
  if (!input.success) {
    title = "Editing user";
  } else {
    const req = {
      headers: headers(),
      cookies: cookies(),
    };

    // @ts-expect-error Type '{ headers: ReadonlyHeaders; cookies: ReadonlyRequestCookies; }' is not assignable to type 'NextApiRequest'
    const data = await getServerCaller({ req, prisma }).viewer.users.get({ userId: input.data.id });
    const { user } = data;
    title = `Editing user: ${user.username}`;
  }

  return await _generateMetadata(
    () => title,
    () => "Here you can edit a current user."
  );
};

export default Page;
