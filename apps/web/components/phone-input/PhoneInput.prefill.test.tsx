import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let mockIsPlatform = false;
let mockDefaultPhoneCountry: string | null = null;
let mockCountryCode = "US";
const renderedProps: Array<{ country?: string; value?: string }> = [];

vi.mock("react-phone-input-2/lib/style.css", () => ({}));

vi.mock("react-phone-input-2", () => ({
  default: ({ country, value }: { country?: string; value?: string }) => {
    renderedProps.push({ country, value });
    const normalizedValue = value ?? "";

    return <input data-testid="phone-input" readOnly value={normalizedValue} />;
  },
}));

vi.mock("@calcom/atoms/hooks/useIsPlatform", () => ({
  useIsPlatform: () => mockIsPlatform,
}));

vi.mock("@calcom/features/bookings/Booker/store", () => ({
  useBookerStore: (selector: (state: { defaultPhoneCountry: string | null }) => unknown) =>
    selector({ defaultPhoneCountry: mockDefaultPhoneCountry }),
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      public: {
        countryCode: {
          useQuery: () => {
            if (!mockCountryCode) {
              return { data: undefined };
            }

            return {
              data: { countryCode: mockCountryCode },
            };
          },
        },
      },
    },
  },
}));

import PhoneInput from "./PhoneInput";

const getLastRenderedProps = (): { country?: string; value?: string } | undefined => renderedProps.at(-1);

describe("PhoneInput prefill", () => {
  beforeEach(() => {
    mockIsPlatform = false;
    mockDefaultPhoneCountry = null;
    mockCountryCode = "US";
    renderedProps.length = 0;
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps the country prop stable when a prefilled value appears after mount", async () => {
    const { rerender } = render(
      <PhoneInput name="attendeePhoneNumber" onChange={vi.fn()} value={undefined} />
    );

    expect(getLastRenderedProps()).toMatchObject({ country: "us", value: undefined });

    rerender(<PhoneInput name="attendeePhoneNumber" onChange={vi.fn()} value="+11234567890" />);

    await waitFor(() => {
      expect(getLastRenderedProps()).toMatchObject({
        country: "us",
        value: "+11234567890",
      });
    });
  });

  it("only syncs detected country changes while the field is empty", async () => {
    const { rerender } = render(
      <PhoneInput name="attendeePhoneNumber" onChange={vi.fn()} value={undefined} />
    );

    mockCountryCode = "IN";
    rerender(<PhoneInput name="attendeePhoneNumber" onChange={vi.fn()} value={undefined} />);

    await waitFor(() => {
      expect(getLastRenderedProps()).toMatchObject({ country: "in", value: undefined });
    });

    rerender(<PhoneInput name="attendeePhoneNumber" onChange={vi.fn()} value="+919999999999" />);

    await waitFor(() => {
      expect(getLastRenderedProps()).toMatchObject({
        country: "in",
        value: "+919999999999",
      });
    });

    mockCountryCode = "GB";
    rerender(<PhoneInput name="attendeePhoneNumber" onChange={vi.fn()} value="+919999999999" />);

    await waitFor(() => {
      expect(getLastRenderedProps()).toMatchObject({
        country: "in",
        value: "+919999999999",
      });
    });
  });
});
