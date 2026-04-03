import type { ReactNode } from "react";

import type { NewAccessScope } from "@calcom/features/oauth/constants";

export interface OnboardingEmbedProps {
  oAuthClientId: string;
  host?: string;
  theme?: "light" | "dark";
  user?: {
    email?: string;
    name?: string;
    username?: string;
  };
  authorization: AuthorizationProps;
  onAuthorizationAllowed?: (result: { code: string }) => void;
  onError?: (error: OnboardingError) => void;
  onAuthorizationDenied?: () => void;
  onClose?: () => void;
  trigger?: ReactNode;
}

export interface AuthorizationProps {
  redirectUri: string;
  scope: NewAccessScope[];
  state: string;
  codeChallenge?: string;
}

export interface OnboardingError {
  code: "INVALID_PROPS" | "SIGNUP_FAILED" | "ONBOARDING_FAILED" | "AUTHORIZATION_FAILED" | "STATE_MISMATCH" | "UNKNOWN";
  message: string;
}
