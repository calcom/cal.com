import { cookies, headers } from "next/headers";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { z } from "zod";

import { handleRazorpayOAuthRedirect } from "@calcom/app-store/razorpay/lib";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

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

// ✅ Client Component for error UI
function ErrorPage({ error }: { error?: string }) {
  const { t } = useLocale();
  return (
    <div
      className="bg-default flex min-h-screen flex-col items-center justify-center px-4"
      data-testid="booking-payment-cb">
      <p className="text-emphasis text-sm font-semibold uppercase tracking-wide">{t("error_404")}</p>

      <h1 className="font-cal text-emphasis mt-2 text-4xl font-extrabold sm:text-5xl">
        {error || "App oauth redirection failed"}
      </h1>

      <Link
        href="/"
        className="text-emphasis hover:text-emphasis-dark mt-4 text-lg underline"
        data-testid="home-link">
        {t("go_back_home")}
      </Link>
    </div>
  );
}
