import { createHash } from "crypto";

import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

const FLAGSMITH_ENVIRONMENT_ID = process.env.FLAGSMITH_ENVIRONMENT_ID;

export const setFlagsmithIdentity = async (
  user: Pick<NonNullable<TrpcSessionUser>, "email" | "id" | "username" | "org">
) => {
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  if (FLAGSMITH_ENVIRONMENT_ID) {
    myHeaders.append("X-Environment-Key", FLAGSMITH_ENVIRONMENT_ID);
  }

  const hashedUserId = createHash("md5").update(`${user.id}`).digest("hex");
  const raw = JSON.stringify({
    identifier: hashedUserId,
    traits: [
      {
        trait_key: "organizationId",
        trait_value: user.organization.id,
      },
      {
        trait_key: "organizationSlug",
        trait_value: user.organization.slug,
      },
      {
        trait_key: "email",
        trait_value: user.email,
      },
    ],
  });

  try {
    const res = await fetch("http://13.233.201.155:8000/api/v1/identities/", {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    });
    const respose = await res.json();
    console.log("rresposeresposeespose", respose);
  } catch (e) {
    return;
  }
};
