import { cookies, headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { z } from "zod";

import { handleRazorpayOAuthRedirect } from "@calcom/app-store/razorpay/lib";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import ErrorPage from "./ErrorPage";

// ✅ zod schema for query params
const querySchema = z.object({
  slug: z.string(),
});

type PageProps = {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function CallbackPage({ params, searchParams }: PageProps) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    throw new Error("User is not logged in");
  }

  const parsedQuery = querySchema.safeParse(params);
  if (!parsedQuery.success) {
    notFound();
  }

  const { slug } = parsedQuery.data;

  try {
    switch (slug) {
      case "razorpay":
        await handleRazorpayOAuthRedirect(searchParams, session.user.id);
        redirect("/apps/installed/payment");
      default:
        notFound();
    }
  } catch (error) {
    // Render error UI (client component)
    return <ErrorPage error={error instanceof Error ? error.message : "App oauth redirection failed"} />;
  }
}
