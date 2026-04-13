import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useLocale } from "./use-locale";

// Initialize a fresh i18next instance for each test
beforeEach(() => {
  i18next.use(initReactI18next).init({
    lng: "en",
    resources: {
      en: {
        common: { greeting: "Hello", save: "Save" },
        settings: { role_name: "Role name" },
      },
      fr: {
        common: { greeting: "Bonjour", save: "Enregistrer" },
      },
    },
    defaultNS: "common",
    interpolation: { escapeValue: false },
  });
});

function TestComponent({ ns }: { ns?: string }) {
  const { t, i18n, isLocaleReady } = useLocale(ns);
  return (
    <div>
      <span data-testid="translated">{t("greeting")}</span>
      <span data-testid="language">{i18n.language}</span>
      <span data-testid="ready">{String(isLocaleReady)}</span>
    </div>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
}

describe("useLocale", () => {
  it("returns t, i18n, and isLocaleReady", () => {
    render(
      <Wrapper>
        <TestComponent />
      </Wrapper>
    );

    expect(screen.getByTestId("translated").textContent).toBe("Hello");
    expect(screen.getByTestId("language").textContent).toBe("en");
    expect(screen.getByTestId("ready").textContent).toBe("true");
  });

  it("defaults to 'common' namespace when no argument is passed", () => {
    render(
      <Wrapper>
        <TestComponent />
      </Wrapper>
    );

    // "greeting" exists in common namespace
    expect(screen.getByTestId("translated").textContent).toBe("Hello");
  });

  it("reads from a specific namespace when provided", () => {
    function SettingsComponent() {
      const { t } = useLocale("settings");
      return <span data-testid="ns-translated">{t("role_name")}</span>;
    }

    render(
      <Wrapper>
        <SettingsComponent />
      </Wrapper>
    );

    expect(screen.getByTestId("ns-translated").textContent).toBe("Role name");
  });

  it("returns the key itself for missing translations", () => {
    function MissingKeyComponent() {
      const { t } = useLocale();
      return <span data-testid="missing">{t("nonexistent_key")}</span>;
    }

    render(
      <Wrapper>
        <MissingKeyComponent />
      </Wrapper>
    );

    expect(screen.getByTestId("missing").textContent).toBe("nonexistent_key");
  });

  it("reflects locale changes via i18n object", async () => {
    render(
      <Wrapper>
        <TestComponent />
      </Wrapper>
    );

    expect(screen.getByTestId("language").textContent).toBe("en");
  });
});
