import { headers } from "next/headers";
import Script from "next/script";
import { parse } from "url";

import PageWrapper from "@components/PageWrapperAppDir";

export default async function PageWrapperLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const nonce = h.get("x-nonce") ?? undefined;
  const headScript = process.env.NEXT_PUBLIC_HEAD_SCRIPTS;
  const bodyScript = process.env.NEXT_PUBLIC_BODY_SCRIPTS;

  const referer = h.get("referer") ?? "";
  const pathname = referer ? parse(referer, true).pathname ?? "/" : "/";

  // Define routes where GTM should NOT be loaded
  const restrictedRoutes = [/^\/d\/.*/]; // Matches /d/[link]/[slug] and other /d/* routes

  // Filter scripts based on the current route
  const scripts = [
    {
      id: "injected-head-script",
      script: headScript ?? "",
    },
    {
      id: "injected-body-script",
      script: restrictedRoutes.some((regex) => regex.test(pathname)) ? "" : bodyScript ?? "",
    },
  ].filter((script): script is { id: string; script: string } => !!script.script);

  return (
    <>
      <PageWrapper requiresLicense={false} nonce={nonce}>
        {children}
        {scripts.map((script) => (
          <Script
            key={script.id}
            nonce={nonce}
            id={script.id}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: script.script,
            }}
          />
        ))}
      </PageWrapper>
    </>
  );
}
