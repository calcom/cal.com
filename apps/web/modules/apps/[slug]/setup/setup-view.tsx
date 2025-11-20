"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import type { getServerSideProps } from "@calcom/app-store/_pages/setup/_getServerSideProps";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { AppSetupPage } from "@calcom/web/components/apps/AppSetupPage";

export type PageProps = inferSSRProps<typeof getServerSideProps>;

export default function SetupInformation(props: PageProps) {
  const searchParams = useCompatSearchParams();
  const router = useRouter();
  const slug = searchParams?.get("slug") as string;
  const { status } = useSession();

  if (status === "loading") {
    return <div className="bg-emphasis absolute z-50 flex h-screen w-full items-center" />;
  }

  if (status === "unauthenticated") {
    const urlSearchParams = new URLSearchParams({
      callbackUrl: `/apps/${slug}/setup`,
    });
    router.replace(`/auth/login?${urlSearchParams.toString()}`);
  }

  return <AppSetupPage slug={slug} {...props} />;
}
