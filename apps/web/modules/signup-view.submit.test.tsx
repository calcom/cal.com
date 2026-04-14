import { SIGNUP_ERROR_CODES } from "@calcom/features/auth/signup/constants";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockCapture, mockFetchSignup, mockFetchUsername, mockRouterPush, mockShowToast, mockSignIn } =
  vi.hoisted(() => ({
    mockCapture: vi.fn(),
    mockFetchSignup: vi.fn(),
    mockFetchUsername: vi.fn(),
    mockRouterPush: vi.fn(),
    mockShowToast: vi.fn(),
    mockSignIn: vi.fn(),
  }));

vi.mock("@calcom/features/auth/signup/lib/fetchSignup", () => ({
  fetchSignup: mockFetchSignup,
  hasCheckoutSession: () => false,
  isAccountUnderReview: () => false,
  isUserAlreadyExistsError: (result: { ok: boolean; status?: number; error?: { message?: string } }) =>
    !result.ok && result.status === 409 && result.error?.message === SIGNUP_ERROR_CODES.USER_ALREADY_EXISTS,
}));

vi.mock("@calcom/lib/fetchUsername", () => ({
  fetchUsername: mockFetchUsername,
}));

vi.mock("@calcom/lib/hooks/useCompatSearchParams", () => ({
  useCompatSearchParams: () => new URLSearchParams(""),
}));

vi.mock("@calcom/lib/hooks/useDebounce", () => ({
  useDebounce: <T,>(value: T) => value,
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
    i18n: {
      language: "en",
    },
  }),
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: mockShowToast,
}));

vi.mock("@dub/analytics/react", () => ({
  Analytics: () => null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

vi.mock("next-auth/react", () => ({
  signIn: mockSignIn,
}));

vi.mock("next/script", () => ({
  default: () => null,
}));

vi.mock("posthog-js", () => ({
  default: {
    capture: mockCapture,
  },
}));

describe("Signup submit flow", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_WEBSITE_URL", "https://cal.com");
    vi.stubEnv("NEXT_PUBLIC_WEBAPP_URL", "https://app.cal.com");
    vi.stubEnv("NEXT_PUBLIC_IS_E2E", "1");
    mockCapture.mockReset();
    mockFetchSignup.mockReset();
    mockFetchUsername.mockReset();
    mockRouterPush.mockReset();
    mockShowToast.mockReset();
    mockSignIn.mockReset();

    mockFetchUsername.mockResolvedValue({
      data: {
        available: true,
        premium: false,
      },
    });

    mockSignIn.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not leave the form loading after a user already exists response", async () => {
    const { default: Signup } = await import("./signup-view");

    mockFetchSignup
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        error: {
          message: SIGNUP_ERROR_CODES.USER_ALREADY_EXISTS,
        },
      });

    const user = userEvent.setup();

    render(
      <TooltipPrimitive.Provider>
        <Signup
          prepopulateFormValues={{
            username: "",
            email: "",
            password: "",
          }}
          token="invite-token"
          orgSlug={undefined}
          isGoogleLoginEnabled={false}
          isOutlookLoginEnabled={false}
          isSAMLLoginEnabled={false}
          orgAutoAcceptEmail={undefined}
          redirectUrl={undefined}
          emailVerificationEnabled={false}
          onboardingV3Enabled={false}
        />
      </TooltipPrimitive.Provider>
    );

    await user.type(screen.getByTestId("signup-usernamefield"), "taken-user");
    await user.type(screen.getByTestId("signup-emailfield"), "taken@example.com");
    await user.type(screen.getByTestId("signup-passwordfield"), "Password123");

    const submitButton = screen.getByTestId("signup-submit-button");

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetchSignup).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    expect(submitButton).not.toBeDisabled();
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(mockFetchSignup).toHaveBeenCalledTimes(1);
    expect(mockSignIn).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 3100));

    expect(mockRouterPush).toHaveBeenCalledWith("/auth/login?callbackUrl=%2Fteams%3Ftoken%3Dinvite-token");
  });
});
