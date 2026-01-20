import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

const ServerPage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      organization: {
        select: { isPlatform: true },
      },
    },
  });

  const isPlatformUser = user?.organization?.isPlatform ?? false;

  if (isPlatformUser) {
    redirect("/settings/platform");
  }

  redirect("/event-types");
};

export default ServerPage;
