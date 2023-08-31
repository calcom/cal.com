import crypto from "crypto";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Authorize() {
  const router = useRouter();

  const { state, client_id, client_secrect } = router.query;
  const authorizationCode = generateAuthorizationCode();
  const client = clientApp.find(
    (uri) => uri.client_id === client_id && uri.client_secrect === client_secrect
  );

  if (!client) return <div>Invalid redirect_uri</div>;

  return (
    <div className="m-5">
      <Link href={`${redirect_uri}?code=${authorizationCode}&state=${state}`}>
        Allow {client?.app} access
      </Link>
    </div>
  );
}

const clientApp = [
  {
    app: "zapier",
    client_id: process.env.ZAPIER_CLIENT_ID,
    client_secrect: process.env.ZAPIER_CLIENT_SECRET,
    redirect_uri: "https://zapier.com/dashboard/auth/oauth/return/App166410CLIAPI/",
    logo: "https://images.ctfassets.net/lzny33ho1g45/Z0jfEpca5ikm81PkL3f9U/e5c4d657839074b70c6d52bcd846b24d/image1.png?w=1400",
  },
];

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
