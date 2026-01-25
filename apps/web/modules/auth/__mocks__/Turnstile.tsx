vi.mock("@calcom/web/modules/auth/components/Turnstile", () => ({
  default: ({ onVerify }: { onVerify: (token: string) => void }) => (
    <div data-testid="turnstile-captcha" onClick={() => onVerify("test-token")}>
      Mock Captcha
    </div>
  ),
}));
