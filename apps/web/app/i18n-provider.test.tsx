import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { useTranslation } from "react-i18next";
import { describe, expect, it } from "vitest";

import { I18nProvider } from "./i18n-provider";

function TranslationReader({ ns, tKey = "greeting" }: { ns?: string; tKey?: string }) {
  const { t, i18n } = useTranslation(ns);
  return (
    <div>
      <span data-testid="translated">{t(tKey)}</span>
      <span data-testid="language">{i18n.language}</span>
    </div>
  );
}

describe("I18nProvider", () => {
  it("hydrates react-i18next so useTranslation returns translations", () => {
    render(
      <I18nProvider locale="en" ns="test_hydrate" translations={{ greeting: "Hello from hydration" }}>
        <TranslationReader ns="test_hydrate" />
      </I18nProvider>
    );

    expect(screen.getByTestId("translated").textContent).toBe("Hello from hydration");
  });

  it("inner I18nProvider shadows outer (locale override for booking pages)", () => {
    render(
      <I18nProvider locale="en" ns="common" translations={{ greeting: "Hello" }}>
        <I18nProvider locale="ja" ns="common" translations={{ greeting: "こんにちは" }}>
          <TranslationReader />
        </I18nProvider>
      </I18nProvider>
    );

    expect(screen.getByTestId("language").textContent).toBe("ja");
  });

  it("nested provider registers additional namespace with react-i18next", () => {
    render(
      <I18nProvider locale="en" ns="common" translations={{ greeting: "Hello" }}>
        <I18nProvider
          locale="en"
          ns="settings_organizations_roles"
          translations={{ role_name: "Role name" }}>
          <TranslationReader ns="settings_organizations_roles" tKey="role_name" />
        </I18nProvider>
      </I18nProvider>
    );

    expect(i18next.hasResourceBundle("en", "settings_organizations_roles")).toBe(true);
    expect(screen.getByTestId("translated").textContent).toBe("Role name");
  });

  it("does not throw on re-render with same locale and namespace", () => {
    const translations = { greeting: "Stable" };
    const { rerender } = render(
      <I18nProvider locale="en" ns="test_rerender" translations={translations}>
        <TranslationReader ns="test_rerender" />
      </I18nProvider>
    );

    rerender(
      <I18nProvider locale="en" ns="test_rerender" translations={translations}>
        <TranslationReader ns="test_rerender" />
      </I18nProvider>
    );

    expect(screen.getByTestId("translated").textContent).toBe("Stable");
  });
});
