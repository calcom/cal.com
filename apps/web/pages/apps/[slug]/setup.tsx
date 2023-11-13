import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppSetupPage } from "@calcom/app-store/_pages/setup";
import { HeadSeo } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

export default function SetupInformation() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = searchParams?.get("slug") as string;

  const { status } = useSession();

  const [setUpPageProps, setSetUpPageProps] = useState<Record<string, unknown>>({});

  useEffect(() => {
    fetch("/api/apps/setup", { method: "POST", body: JSON.stringify({ slug }) })
      .then(
        (res) =>
          res.json() as {
            redirect?: {
              destination: string;
              permanent: boolean;
            };
            props?: Record<string, unknown>;
          }
      )
      .then((data) => {
        if (data.redirect) {
          router.replace(data.redirect.destination);
        } else if (data.props) {
          setSetUpPageProps(data.props);
        }
      });
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
      {Object.keys(setUpPageProps).length && <AppSetupPage slug={slug} {...setUpPageProps} />}
    </>
  );
}

SetupInformation.PageWrapper = PageWrapper;
