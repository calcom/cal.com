import { handleErrorsJson } from "@lib/errors";

export interface ThetisInstructorDataResponse {
  ok: boolean;
  statusText?: string;
  data?: {
    products?: [
      {
        name: string;
        price: number;
      }
    ];
    handle?: string;
    email?: string;
    publicName?: string;
    stripeConnectAccountId?: string;
  };
}

async function getInstructor(id: string): Promise<ThetisInstructorDataResponse> {
  if (!process.env.THETIS_SITE_HOST) {
    throw new Error("Missing config value for THETIS_SITE_HOST");
  }

  if (!process.env.THETIS_API_KEY) {
    throw new Error("Missing value for THETIS_API_KEY");
  }

  const response = await fetch(`${process.env.THETIS_SITE_HOST}/api/common/instructor`, {
    method: "POST",
    headers: {
      "x-api-key": process.env.THETIS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  });

  const instructorData: ThetisInstructorDataResponse = await handleErrorsJson(response);
  return instructorData;
}

export { getInstructor };
