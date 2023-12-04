import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppSetupPage } from "@calcom/app-store/_pages/setup";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { HeadSeo } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

export default function SetupInformation() {
  const searchParams = useCompatSearchParams();
  const router = useRouter();
  const slug = searchParams?.get("slug") as string;
  const { status } = useSession();

  useEffect(() => {
    fetch("/api/apps/setup", { method: "POST", body: JSON.stringify({ slug }) }).then(
      (res) =>
        res.json() as {
          redirect?: {
            destination: string;
            permanent: boolean;
          };
          props?: Record<string, unknown>;
        }
    );
  }, [router, slug]);

  if (status === "loading") {
    return <div className="bg-emphasis absolute z-50 flex h-screen w-full items-center" />;
  }

  if (status === "unauthenticated") {
    const urlSearchParams = new URLSearchParams({
      callbackUrl: `/apps/${slug}/setup`,
    });
    router.replace(`/auth/login?${urlSearchParams.toString()}`);
  }

  return (
    <>
      {/* So that the set up page does not get indexed by search engines */}
      <HeadSeo nextSeoProps={{ noindex: true, nofollow: true }} title={`${slug} | Cal.com`} description="" />
      <AppSetupPage slug={slug} />
    </>
  );
}

SetupInformation.PageWrapper = PageWrapper;
