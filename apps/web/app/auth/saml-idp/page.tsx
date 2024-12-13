import type { PageProps } from "app/_types";
import { notFound } from "next/navigation";
import { z } from "zod";

import SamlIdpClient from "~/auth/saml-idp/saml-idp-view";

const querySchema = z.object({
  code: z.string(),
});

export default async function SamlIdpPage({ params, searchParams }: PageProps) {
  const parsed = querySchema.safeParse({ ...params, ...searchParams });
  if (!parsed.success) {
    notFound();
  }

  return <SamlIdpClient code={parsed.data.code} />;
}
