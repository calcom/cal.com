import crypto from "crypto";
import Link from "next/link";
import { useRouter } from "next/router";

import { trpc } from "@calcom/trpc/react";

export default function Authorize() {
  const router = useRouter();

  const { state, client_id, client_secrect } = router.query;
  const authorizationCode = generateAuthorizationCode();

  const { data: client, isLoading } = trpc.viewer.oAuth.getClient.useQuery({
    clientId: "7A1B4F8D2E6C9A3F0B7E5D1C6A2F3C8E",
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
