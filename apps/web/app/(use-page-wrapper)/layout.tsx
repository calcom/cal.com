import { cookies, headers } from "next/headers";
import Script from "next/script";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { ExperimentProvider } from "@calcom/web/modules/experiments/provider";
import { getCachedExperimentData } from "@calcom/web/modules/experiments/getCachedExperimentData";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import PageWrapper from "@components/PageWrapperAppDir";

export default async function PageWrapperLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const nonce = h.get("x-csp-nonce") ?? undefined;
  const session = await getServerSession({ req: buildLegacyRequest(h, await cookies()) });
  const experimentData = await getCachedExperimentData(session?.user?.id);
  const headScript = process.env.NEXT_PUBLIC_HEAD_SCRIPTS;
  const bodyScript = process.env.NEXT_PUBLIC_BODY_SCRIPTS;

  const scripts = [
    {
      id: "injected-head-script",
      script: headScript ?? "",
    },
    {
      id: "injected-body-script",
      script: bodyScript ?? "",
    },
  ].filter((script): script is { id: string; script: string } => !!script.script);

  return (
    <>
      <PageWrapper requiresLicense={false} nonce={nonce}>
        <ExperimentProvider {...experimentData}>
        {children}
        </ExperimentProvider>
        {scripts.map((script) => (
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Injected scripts from env vars
          <Script
            key={script.id}
            nonce={nonce}
            id={script.id}
            dangerouslySetInnerHTML={{
              __html: script.script,
            }}
          />
        ))}
      </PageWrapper>
    </>
  );
}
