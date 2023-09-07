import crypto from "crypto";
import Link from "next/link";
import { useRouter } from "next/router";

import { getLayout } from "@calcom/features/NoShellLayout";
import { trpc } from "@calcom/trpc/react";

import PageWrapper from "@components/PageWrapper";

export default function Authorize() {
  const router = useRouter();

  const { state, client_id, client_secrect } = router.query;

  const authorizationCode = generateAuthorizationCode();

  const { data: client, isLoading } = trpc.viewer.oAuth.getClient.useQuery({
    clientId: client_id,
  });

  if (isLoading) return <div>Loading...</div>;

  if (!client) return <div>Unauthorized</div>;

  return (
    <div className="m-5">
      <Link href={`${client.redirectUri}?code=${authorizationCode}&state=${state}`}>
        Allow {client.name} access
      </Link>
    </div>
  );
}

Authorize.PageWrapper = PageWrapper;
Authorize.getLayout = getLayout;

function generateAuthorizationCode() {
  const codeLength = 40;
  const randomBytes = crypto.randomBytes(codeLength);
  const authorizationCode = randomBytes
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return authorizationCode;
}
