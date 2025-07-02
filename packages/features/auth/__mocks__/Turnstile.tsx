vi.mock("@calcom/features/auth/Turnstile", () => ({
  default: ({ onVerify }: { onVerify: (token: string) => void }) => (
    <div data-testid="turnstile-captcha" onClick={() => onVerify("test-token")}>
      Mock Captcha
    </div>
  ),
}));
