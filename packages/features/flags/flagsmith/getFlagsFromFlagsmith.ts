import { createHash } from "crypto";
import type { Session } from "next-auth";

type Feature = {
  feature_state_value: null;
  feature: {
    name: string;
    id: number;
    type: string;
  };
  enabled: boolean;
};

const FLAGSMITH_ENVIRONMENT_ID = process.env.FLAGSMITH_ENVIRONMENT_ID;

export default async function getFlagsFromFlagsmith(user?: Session["user"]) {
  const baseUrl = `https://edge.api.flagsmith.com/api/v1`;
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  if (FLAGSMITH_ENVIRONMENT_ID) {
    headers.append("X-Environment-Key", FLAGSMITH_ENVIRONMENT_ID);
  }
  if (user?.id) {
    /**
     * if we have the current user then:
     * Lazily create an Identity in flagsmith
     * Set Traits for the Identity
     * Receive the Flags for that Identity
     */
    const hashedUserId = createHash("md5").update(`${user.id}`).digest("hex");
    const raw = JSON.stringify({
      identifier: hashedUserId,
      traits: [
        {
          trait_key: "organizationId",
          trait_value: user?.org?.id,
        },
        {
          trait_key: "organizationSlug",
          trait_value: user?.org?.slug,
        },
        {
          trait_key: "email",
          trait_value: user.email,
        },
      ],
    });
    const response = await fetch(`${baseUrl}/identities`, {
      method: "POST",
      headers: headers,
      body: raw,
      redirect: "follow",
    });
    const res = await response.json();
    return res.flags as Feature[];
  } else {
    // else we can still get global flags from flagsmith
    const uri = `${baseUrl}/flags`;
    const response = await fetch(uri, {
      method: "GET",
      headers,
    });
    const res = await response.json();
    return res as Feature[];
  }
}
