import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

import EnableTwoFactorModal from "./EnableTwoFactorModal";

vi.mock("./TwoFactorAuthAPI", () => ({
  default: { setup: vi.fn(), enable: vi.fn() },
}));

// t returns the key, so the assertions below prove the message comes from the catalog
// rather than from the browser.
vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key, isLocaleReady: true, i18n: { exists: () => false } }),
}));

// The dialog reads the app router, which isn't mounted under jsdom.
vi.mock("next/navigation", async () => ({
  ...((await vi.importActual("next/navigation")) as object),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/settings/security/two-factor-auth",
  useSearchParams: () => new URLSearchParams(),
}));

const renderModal = () => {
  render(
    <TooltipProvider>
      <EnableTwoFactorModal open onOpenChange={vi.fn()} onEnable={vi.fn()} onCancel={vi.fn()} />
    </TooltipProvider>
  );
  return document.querySelector('input[name="password"]') as HTMLInputElement;
};

describe("EnableTwoFactorModal", () => {
  it("reports the empty password with a translated message instead of the browser's", () => {
    const password = renderModal();

    expect(password.required).toBe(true);
    expect(password.validity.valueMissing).toBe(true);

    password.checkValidity();

    expect(password.validity.customError).toBe(true);
    expect(password.validationMessage).toBe("field_required");
  });

  it("clears the message once the field is edited so it can go valid again", () => {
    const password = renderModal();

    password.checkValidity();
    expect(password.validity.customError).toBe(true);

    fireEvent.input(password, { target: { value: "hunter2" } });

    expect(password.validity.customError).toBe(false);
    expect(password.checkValidity()).toBe(true);
  });
});
