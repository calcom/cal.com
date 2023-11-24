import Page from "@pages/settings/admin/users/[id]/edit";
import { trpc } from "app/_trpc/client";
import { type Params } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { z } from "zod";

const userIdSchema = z.object({ id: z.coerce.number() });

export const generateMetadata = async ({ params }: { params: Params }) => {
  const input = userIdSchema.safeParse(params);

  let title = "";
  if (!input.success) {
    title = "Editing user";
  } else {
    // @ts-expect-error Property 'useSuspenseQuery' does not exist on type
    const [data] = trpc.viewer.users.get.useSuspenseQuery({ userId: input.data.id });
    const { user } = data;
    title = `Editing user: ${user.username}`;
  }

  return await _generateMetadata(
    () => title,
    () => "Here you can edit a current user."
  );
};

export default Page;
