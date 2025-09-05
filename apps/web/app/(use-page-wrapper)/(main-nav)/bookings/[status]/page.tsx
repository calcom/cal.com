// apps/web/app/(use-page-wrapper)/(main-nav)/bookings/[status]/page.tsx
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { validStatuses } from "~/bookings/lib/validStatuses";

import { BookingsClient } from "./BookingsClient";

const querySchema = z.object({
  status: z.enum(validStatuses),
});

export const generateMetadata = async ({ params }: { params: Promise<{ status: string }> }) =>
  await _generateMetadata(
    (t) => t("bookings"),
    (t) => t("bookings_description"),
    undefined,
    undefined,
    `/bookings/${(await params).status}`
  );

const Page = async ({ params }: PageProps) => {
  const parsed = querySchema.safeParse(await params);
  if (!parsed.success) {
    redirect("/bookings/upcoming");
  }
  const t = await getTranslate();
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  // Keep userId as string - no need to convert to number
  const userId = session?.user?.id;

  return (
    <ShellMainAppDir heading={t("bookings")} subtitle={t("bookings_description")}>
      <BookingsClient status={parsed.data.status} userId={userId} />
    </ShellMainAppDir>
  );
};

export default Page;
