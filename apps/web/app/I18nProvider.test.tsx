import { render, screen } from "@testing-library/react";
import { useContext } from "react";
import { describe, expect, it } from "vitest";
import { I18nContext, I18nExtend, I18nProvider } from "./I18nProvider";

function ContextReader() {
  const ctx = useContext(I18nContext);
  return (
    <div>
      <span data-testid="locale">{ctx?.locale}</span>
      <span data-testid="ns">{ctx?.ns}</span>
      <span data-testid="translations">{JSON.stringify(ctx?.translations)}</span>
    </div>
  );
}

describe("I18nProvider", () => {
  it("provides locale, ns, and translations to children", () => {
    const translations = { hello: "world" };
    render(
      <I18nProvider locale="en" ns="common" translations={translations}>
        <ContextReader />
      </I18nProvider>
    );

    expect(screen.getByTestId("locale").textContent).toBe("en");
    expect(screen.getByTestId("ns").textContent).toBe("common");
    expect(screen.getByTestId("translations").textContent).toBe(JSON.stringify(translations));
  });

  it("inner I18nProvider shadows outer (locale override for booking pages)", () => {
    render(
      <I18nProvider locale="en" ns="common" translations={{ greeting: "Hello" }}>
        <I18nProvider locale="ja" ns="common" translations={{ greeting: "こんにちは" }}>
          <ContextReader />
        </I18nProvider>
      </I18nProvider>
    );

    expect(screen.getByTestId("locale").textContent).toBe("ja");
    expect(screen.getByTestId("translations").textContent).toBe(JSON.stringify({ greeting: "こんにちは" }));
  });
});

describe("I18nExtend", () => {
  it("merges translations on top of parent and inherits locale", () => {
    render(
      <I18nProvider locale="en" ns="common" translations={{ greeting: "Hello", save: "Save" }}>
        <I18nExtend ns="pbac" translations={{ role_name: "Role name" }}>
          <ContextReader />
        </I18nExtend>
      </I18nProvider>
    );

    expect(screen.getByTestId("locale").textContent).toBe("en");
    expect(screen.getByTestId("ns").textContent).toBe("common+pbac");

    const translations = JSON.parse(screen.getByTestId("translations").textContent ?? "{}");
    expect(translations).toEqual({
      greeting: "Hello",
      save: "Save",
      role_name: "Role name",
    });
  });

  it("child translations override parent translations for the same key", () => {
    render(
      <I18nProvider locale="fr" ns="common" translations={{ title: "Titre", save: "Enregistrer" }}>
        <I18nExtend ns="feature" translations={{ title: "Titre personnalisé" }}>
          <ContextReader />
        </I18nExtend>
      </I18nProvider>
    );

    const translations = JSON.parse(screen.getByTestId("translations").textContent ?? "{}");
    expect(translations.title).toBe("Titre personnalisé");
    expect(translations.save).toBe("Enregistrer");
  });

  it("stacks multiple I18nExtend layers", () => {
    render(
      <I18nProvider locale="en" ns="common" translations={{ a: "1" }}>
        <I18nExtend ns="feature1" translations={{ b: "2" }}>
          <I18nExtend ns="feature2" translations={{ c: "3" }}>
            <ContextReader />
          </I18nExtend>
        </I18nExtend>
      </I18nProvider>
    );

    expect(screen.getByTestId("ns").textContent).toBe("common+feature1+feature2");

    const translations = JSON.parse(screen.getByTestId("translations").textContent ?? "{}");
    expect(translations).toEqual({ a: "1", b: "2", c: "3" });
  });

  it("throws when used outside I18nProvider", () => {
    expect(() =>
      render(
        <I18nExtend ns="pbac" translations={{}}>
          <ContextReader />
        </I18nExtend>
      )
    ).toThrow("I18nExtend must be used inside an I18nProvider");
  });
});
