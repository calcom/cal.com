import { cookies, headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { z } from "zod";

import { handleRazorpayOAuthRedirect } from "@calcom/app-store/razorpay/lib";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { WEBAPP_URL } from "@calcom/lib/constants";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import ErrorPage from "./ErrorPage";

// ✅ zod schema for query params
const querySchema = z.object({
  slug: z.string().optional(),
});

type PageProps = {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    throw new Error("User is not logged in");
  }

  const parsedQuery = querySchema.safeParse(await params);
  if (!parsedQuery.success) {
    notFound();
  }

  const { slug } = parsedQuery.data;

  try {
    switch (slug) {
      case "razorpay":
        await handleRazorpayOAuthRedirect(await searchParams, session.user.id);
      default:
        if (slug !== "razorpay") {
          notFound();
        }
    }
  } catch (error) {
    // Render error UI (client component)
    return <ErrorPage error={error instanceof Error ? error.message : "App oauth redirection failed"} />;
  }
  redirect(`${WEBAPP_URL}/apps/installed/payment`);
}
