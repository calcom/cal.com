import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import HomePage from "~/home/home-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => "Home",
    () => "Your central hub for scheduling and managing meetings",
    undefined,
    undefined,
    "/home"
  );
};

const ServerPage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect("/auth/login");
  }
  return <HomePage />;
};
export default ServerPage;
