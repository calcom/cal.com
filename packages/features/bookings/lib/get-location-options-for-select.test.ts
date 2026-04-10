import { DefaultEventLocationTypeEnum } from "@calcom/app-store/locations";
import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import getLocationOptionsForSelect from "./getLocationOptionsForSelect";

const t = vi.fn((key: string) => {
  if (key === "somewhere_else") return "Somewhere else";
  if (key === "any_location") return "Any location";
  return key;
}) as unknown as TFunction;

describe("getLocationOptionsForSelect", () => {
  it("uses custom label for somewhereElse when present", () => {
    const locations = [
      {
        type: DefaultEventLocationTypeEnum.SomewhereElse,
        customLabel: "Meet me nearby",
      },
    ];

    const options = getLocationOptionsForSelect(locations, t);

    expect(options).toHaveLength(1);
    expect(options[0]?.label).toBe("Meet me nearby");
  });

  it("falls back to 'Somewhere else' when no custom label is set", () => {
    const locations = [
      {
        type: DefaultEventLocationTypeEnum.SomewhereElse,
      },
    ];

    const options = getLocationOptionsForSelect(locations, t);

    expect(options).toHaveLength(1);
    expect(options[0]?.label).toBe("Somewhere else");
  });
});
