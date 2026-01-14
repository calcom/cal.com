import { SIGNUP_ERROR_CODES } from "../constants";

type SignupData = {
  username?: string;
  email: string;
  password: string;
  language: string;
  token?: string;
};

type SignupSuccessResponse = {
  message: string;
  stripeCustomerId?: string;
};

type SignupErrorResponse = {
  message: string;
  checkoutSessionId?: string;
};

type SignupResponse = SignupSuccessResponse | SignupErrorResponse;

export type SignupResult =
  | { ok: true; data: SignupSuccessResponse }
  | { ok: false; status: number; error: SignupErrorResponse };

export async function fetchSignup(data: SignupData, cfToken?: string): Promise<SignupResult> {
  const allParams = new URLSearchParams(window.location.search);

  const utmParams = new URLSearchParams();
  const utmKeys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "utm_referral",
    "landing_page",
  ];

  utmKeys.forEach((key) => {
    const value = allParams.get(key);
    if (value) utmParams.set(key, value);
  });

  const url = utmParams.toString() ? `/api/auth/signup?${utmParams.toString()}` : "/api/auth/signup";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "cf-access-token": cfToken ?? "invalid-token",
    },
    body: JSON.stringify(data),
  });

  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return {
      ok: false,
      status: response.status,
      error: { message: SIGNUP_ERROR_CODES.INVALID_SERVER_RESPONSE },
    };
  }

  const json = (await response.json()) as SignupResponse;

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: json as SignupErrorResponse,
    };
  }

  return {
    ok: true,
    data: json as SignupSuccessResponse,
  };
}

export function isUserAlreadyExistsError(result: SignupResult): boolean {
  return (
    !result.ok && result.status === 409 && result.error.message === SIGNUP_ERROR_CODES.USER_ALREADY_EXISTS
  );
}

export function hasCheckoutSession(
  result: SignupResult
): result is { ok: false; status: number; error: SignupErrorResponse & { checkoutSessionId: string } } {
  return !result.ok && !!result.error.checkoutSessionId;
}
