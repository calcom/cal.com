import { describe, it, expect, vi, beforeEach } from "vitest";

import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import type { BookingResponse } from "@calcom/features/bookings/types";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { navigateInTopWindow } from "@calcom/lib/navigateInTopWindow";

import { useBookingSuccessRedirect } from "./bookingSuccessRedirect";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@calcom/lib/navigateInTopWindow", () => ({
  navigateInTopWindow: vi.fn(),
}));

vi.mock("@calcom/lib/hooks/useCompatSearchParams", () => ({
  useCompatSearchParams: vi.fn(),
}));

vi.mock("@calcom/embed-core/embed-iframe", () => ({
  useIsEmbed: vi.fn(),
}));

describe("useBookingSuccessRedirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCompatSearchParams).mockReturnValue(new URLSearchParams() as any);
    vi.mocked(useIsEmbed).mockReturnValue(false);
  });

  const mockBooking: Pick<
    BookingResponse,
    | "uid"
    | "title"
    | "description"
    | "startTime"
    | "endTime"
    | "location"
    | "attendees"
    | "user"
    | "responses"
  > = {
    uid: "test-booking-uid",
    title: "Test Meeting",
    description: "Test Description",
    startTime: new Date("2024-01-01T10:00:00Z"),
    endTime: new Date("2024-01-01T11:00:00Z"),
    location: "Zoom",
    attendees: [
      {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        timeZone: "UTC",
        locale: "en",
        phoneNumber: "+1234567890",
        bookingId: 1,
        noShow: false,
      },
    ],
    user: {
      email: null,
      name: "Jane Host",
      timeZone: "UTC",
      username: "jane-host",
    },
    responses: {
      name: "John Doe",
      phone: "+1234567890",
    },
  };

  describe("external redirect without forwardParamsSuccessRedirect", () => {
    it("should redirect to external URL without any parameters", () => {
      const bookingSuccessRedirect = useBookingSuccessRedirect();

      bookingSuccessRedirect({
        successRedirectUrl: "https://example.com/success",
        forwardParamsSuccessRedirect: false,
        query: { test: "value", embed: "namespace" },
        booking: mockBooking,
      });

      expect(navigateInTopWindow).toHaveBeenCalledWith("https://example.com/success");
    });
  });

  describe("external redirect with forwardParamsSuccessRedirect", () => {
    it("should redirect to external URL with booking params but filter out embed params", () => {
      const bookingSuccessRedirect = useBookingSuccessRedirect();

      bookingSuccessRedirect({
        successRedirectUrl: "https://example.com/success",
        forwardParamsSuccessRedirect: true,
        query: {
          test: "value",
          embed: "namespace",
          layout: "month_view",
          embedType: "inline",
          "ui.color-scheme": "dark",
        },
        booking: mockBooking,
      });

      expect(navigateInTopWindow).toHaveBeenCalledTimes(1);
      const calledUrl = vi.mocked(navigateInTopWindow).mock.calls[0][0];
      const url = new URL(calledUrl);

      expect(url.searchParams.get("test")).toBe("value");
      expect(url.searchParams.get("uid")).toBe("test-booking-uid");
      expect(url.searchParams.get("title")).toBe("Test Meeting");

      expect(url.searchParams.get("embed")).toBeNull();
      expect(url.searchParams.get("layout")).toBeNull();
      expect(url.searchParams.get("embedType")).toBeNull();
      expect(url.searchParams.get("ui.color-scheme")).toBeNull();
    });

    it("should include cal.rerouting param from searchParams", () => {
      vi.mocked(useCompatSearchParams).mockReturnValue(new URLSearchParams("cal.rerouting=true") as any);

      const bookingSuccessRedirect = useBookingSuccessRedirect();

      bookingSuccessRedirect({
        successRedirectUrl: "https://example.com/success",
        forwardParamsSuccessRedirect: true,
        query: { test: "value" },
        booking: mockBooking,
      });

      const calledUrl = vi.mocked(navigateInTopWindow).mock.calls[0][0];
      const url = new URL(calledUrl);
      expect(url.searchParams.get("cal.rerouting")).toBe("true");
    });

    it("should exclude embed params from searchParams even when forwardParamsSuccessRedirect is true", () => {
      vi.mocked(useCompatSearchParams).mockReturnValue(
        new URLSearchParams(
          "embed=namespace&layout=month_view&embedType=inline&ui.color-scheme=dark&test=value"
        ) as any
      );

      const bookingSuccessRedirect = useBookingSuccessRedirect();

      bookingSuccessRedirect({
        successRedirectUrl: "https://example.com/success",
        forwardParamsSuccessRedirect: true,
        query: { additional: "param" },
        booking: mockBooking,
      });

      const calledUrl = vi.mocked(navigateInTopWindow).mock.calls[0][0];
      const url = new URL(calledUrl);

      // Embed params should be excluded
      expect(url.searchParams.get("embed")).toBeNull();
      expect(url.searchParams.get("layout")).toBeNull();
      expect(url.searchParams.get("embedType")).toBeNull();
      expect(url.searchParams.get("ui.color-scheme")).toBeNull();

      // Non-embed params should be included
      expect(url.searchParams.get("test")).toBe("value");
      expect(url.searchParams.get("additional")).toBe("param");
    });
  });

  describe("internal redirect to booking page", () => {
    it("should redirect to booking page without embed suffix when not in embed", () => {
      vi.mocked(useIsEmbed).mockReturnValue(false);

      const bookingSuccessRedirect = useBookingSuccessRedirect();

      bookingSuccessRedirect({
        successRedirectUrl: null,
        forwardParamsSuccessRedirect: false,
        query: { test: "value", embed: "namespace" },
        booking: mockBooking,
      });

      expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/booking\/test-booking-uid\?/));

      const calledUrl = mockPush.mock.calls[0][0];
      expect(calledUrl).not.toContain("/embed");
      expect(calledUrl).toContain("test=value");
    });

    it("should redirect to booking page with embed suffix when in embed", () => {
      vi.mocked(useIsEmbed).mockReturnValue(true);

      const bookingSuccessRedirect = useBookingSuccessRedirect();

      bookingSuccessRedirect({
        successRedirectUrl: null,
        forwardParamsSuccessRedirect: false,
        query: { test: "value" },
        booking: mockBooking,
      });

      expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/booking\/test-booking-uid\/embed\?/));
    });

    it("should not exclude embed params from booking page", () => {
      vi.mocked(useIsEmbed).mockReturnValue(false);

      const bookingSuccessRedirect = useBookingSuccessRedirect();

      bookingSuccessRedirect({
        successRedirectUrl: null,
        forwardParamsSuccessRedirect: false,
        query: {
          test: "value",
          embed: "namespace",
          layout: "month_view",
          embedType: "inline",
          "ui.color-scheme": "dark",
        },
        booking: mockBooking,
      });

      expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/booking\/test-booking-uid\?/));

      const calledUrl = mockPush.mock.calls[0][0];
      expect(calledUrl).toContain("test=value");
      expect(calledUrl).toContain("embed=namespace");
      expect(calledUrl).toContain("layout=month_view");
      expect(calledUrl).toContain("embedType=inline");
      expect(calledUrl).toContain("ui.color-scheme=dark");
    });

    it("should include flag.coep from searchParams in internal redirect", () => {
      vi.mocked(useCompatSearchParams).mockReturnValue(new URLSearchParams("flag.coep=true") as any);

      const bookingSuccessRedirect = useBookingSuccessRedirect();

      bookingSuccessRedirect({
        successRedirectUrl: null,
        forwardParamsSuccessRedirect: false,
        query: { test: "value" },
        booking: mockBooking,
      });

      const calledUrl = mockPush.mock.calls[0][0];
      expect(calledUrl).toContain("flag.coep=true");
    });

    it("should include cal.rerouting param from searchParams", () => {
      vi.mocked(useCompatSearchParams).mockReturnValue(new URLSearchParams("cal.rerouting=true") as any);

      const bookingSuccessRedirect = useBookingSuccessRedirect();

      bookingSuccessRedirect({
        successRedirectUrl: null,
        forwardParamsSuccessRedirect: true,
        query: { test: "value" },
        booking: mockBooking,
      });
      const calledUrl = mockPush.mock.calls[0][0];
      expect(calledUrl).toContain("cal.rerouting=true");
    });
  });

  describe("booking parameter extraction", () => {
    it("should extract and include booking details in external redirect", () => {
      const bookingSuccessRedirect = useBookingSuccessRedirect();

      bookingSuccessRedirect({
        successRedirectUrl: "https://example.com/success",
        forwardParamsSuccessRedirect: true,
        query: {},
        booking: mockBooking,
      });

      const calledUrl = vi.mocked(navigateInTopWindow).mock.calls[0][0];
      const url = new URL(calledUrl);

      expect(url.searchParams.get("uid")).toBe("test-booking-uid");
      expect(url.searchParams.get("title")).toBe("Test Meeting");
      expect(url.searchParams.get("description")).toBe("Test Description");
      expect(url.searchParams.get("location")).toBe("Zoom");
      expect(url.searchParams.get("attendeeName")).toBe("John Doe");
      expect(url.searchParams.get("hostName")).toBe("Jane Host");
      expect(url.searchParams.get("phone")).toBe("+1234567890");
    });
  });
});
