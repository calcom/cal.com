import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { BookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { getQueryParam } from "@calcom/features/bookings/Booker/utils/query-param";
import { bookingMetadataSchema } from "@calcom/prisma/zod-utils";

import { useBookings } from "./useBookings";

const mockBookingMetadataSchema = vi.mocked(bookingMetadataSchema);

// Mock dependencies
vi.mock("@calcom/features/bookings/Booker/utils/query-param", () => ({
  getQueryParam: vi.fn(),
  updateQueryParam: vi.fn(),
}));

vi.mock("@calcom/features/bookings/lib/create-booking", () => ({
  createBooking: vi.fn(),
}));

vi.mock("@calcom/features/bookings/lib/create-instant-booking", () => ({
  createInstantBooking: vi.fn(),
}));

vi.mock("@calcom/features/bookings/lib/create-recurring-booking", () => ({
  createRecurringBooking: vi.fn(),
}));

vi.mock("@calcom/features/bookings/lib/bookingSuccessRedirect", () => ({
  useBookingSuccessRedirect: () => vi.fn(),
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (text: string) => text,
  }),
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
}));

vi.mock("@calcom/atoms/hooks/bookings/useHandleBookEvent", () => ({
  useHandleBookEvent: () => ({
    handleBookEvent: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock("@calcom/features/bookings/Booker/hooks/useBookingForm", () => ({
  useBookingForm: () => ({
    bookingForm: {
      watch: vi.fn(),
      setValue: vi.fn(),
      getValues: vi.fn().mockReturnValue({ responses: {} }),
    },
    formEmail: "",
    bookerFormErrorRef: { current: null },
    key: "test-key",
  }),
}));

vi.mock("@calcom/lib/webstorage", () => ({
  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock("@calcom/embed-core/embed-iframe", () => ({
  sdkActionManager: {
    fire: vi.fn(),
  },
  useIsEmbed: () => false,
}));

vi.mock("@calcom/lib/hooks/useCompatSearchParams", () => ({
  useCompatSearchParams: () => new URLSearchParams(),
}));

vi.mock("@calcom/features/bookings/lib/client/decoyBookingStore", () => ({
  storeDecoyBooking: vi.fn(),
}));

vi.mock("@calcom/app-store/stripepayment/lib/client", () => ({
  createPaymentLink: vi.fn(),
}));

// Create mock function that can be accessed after vi.mock hoisting
const mockUseQuery = vi.fn();
vi.mock("@calcom/trpc/react", () => {
  const mockUseQueryFn = vi.fn();
  // Store reference globally so we can access it in tests
  (globalThis as any).__mockUseQuery = mockUseQueryFn;
  return {
    trpc: {
      viewer: {
        bookings: {
          getInstantBookingLocation: {
            useQuery: mockUseQueryFn,
          },
        },
      },
    },
  };
});

// Get the mock function reference after module is loaded
const getMockUseQuery = () => (globalThis as any).__mockUseQuery as ReturnType<typeof vi.fn>;

// Mock bookingMetadataSchema.parse
vi.mock("@calcom/prisma/zod-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/prisma/zod-utils")>();
  return {
    ...actual,
    bookingMetadataSchema: {
      ...actual.bookingMetadataSchema,
      parse: vi.fn(),
    },
  };
});

const createMockStore = (isInstantMeeting: boolean) => {
  const state = {
    eventSlug: "test-event",
    eventId: 1,
    isInstantMeeting,
    rescheduleUid: null,
    rescheduledBy: null,
    bookingData: null,
    selectedTimeslot: null,
    selectedDuration: null,
    setRescheduleUid: vi.fn(),
    setBookingData: vi.fn(),
  };

  return {
    getState: () => state,
    setState: vi.fn(),
    subscribe: vi.fn(),
    destroy: vi.fn(),
  };
};

const mockEvent = {
  data: {
    id: 1,
    slug: "test-event",
    length: 30,
    requiresConfirmation: false,
    recurringEvent: null,
    schedulingType: null,
    metadata: {},
    successRedirectUrl: null,
    forwardParamsSuccessRedirect: false,
    subsetOfHosts: [],
    isDynamic: false,
    subsetOfUsers: [],
  },
  isSuccess: true,
  isPending: false,
};

const createTestWrapper = (mockStore: ReturnType<typeof createMockStore>) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BookerStoreContext.Provider value={mockStore as any}>{children}</BookerStoreContext.Provider>
    </QueryClientProvider>
  );
};

describe("useBookings - Instant Booking Query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockUseQueryFn = getMockUseQuery();
    mockUseQueryFn.mockReturnValue({
      data: undefined,
      isPending: false,
    });
  });

  it("should NOT enable instant booking query when bookingUid exists but isInstantMeeting is false (seated event scenario - THE BUG)", () => {
    vi.mocked(getQueryParam).mockReturnValue("test-booking-uid");

    const mockStore = createMockStore(false);

    renderHook(() => useBookings({ event: mockEvent, bookingForm: {} as any, metadata: {} }), {
      wrapper: createTestWrapper(mockStore),
    });

    const mockUseQueryFn = getMockUseQuery();
    expect(mockUseQueryFn).toHaveBeenCalledWith(
      {
        bookingUid: "test-booking-uid",
      },
      expect.objectContaining({
        enabled: false, // FIX: Should be false when isInstantMeeting is false
      })
    );
  });

  it("should enable instant booking query when bookingUid exists AND isInstantMeeting is true", () => {
    vi.mocked(getQueryParam).mockReturnValue("test-booking-uid");

    const mockStore = createMockStore(true);

    renderHook(() => useBookings({ event: mockEvent, bookingForm: {} as any, metadata: {} }), {
      wrapper: createTestWrapper(mockStore),
    });

    const mockUseQueryFn = getMockUseQuery();
    expect(mockUseQueryFn).toHaveBeenCalledWith(
      {
        bookingUid: "test-booking-uid",
      },
      expect.objectContaining({
        enabled: true, // Should be true when isInstantMeeting is true
      })
    );
  });

  it("should NOT set instantVideoMeetingUrl when query returns data but isInstantMeeting is false (prevents redirect bug)", async () => {
    vi.mocked(getQueryParam).mockReturnValue("test-booking-uid");

    const mockBookingData = {
      booking: {
        uid: "test-booking-uid",
        metadata: {
          videoCallUrl: "http://localhost:3000/video/test-booking-uid",
        },
      },
    };

    const mockUseQueryFn = getMockUseQuery();
    mockUseQueryFn.mockReturnValue({
      data: mockBookingData,
      isPending: false,
    });

    mockBookingMetadataSchema.parse.mockReturnValue({
      videoCallUrl: "http://localhost:3000/video/test-booking-uid",
    });

    const mockStore = createMockStore(false);

    const { result } = renderHook(
      () => useBookings({ event: mockEvent, bookingForm: {} as any, metadata: {} }),
      {
        wrapper: createTestWrapper(mockStore),
      }
    );

    await waitFor(() => {
      // FIX: instantVideoMeetingUrl should remain undefined when isInstantMeeting is false
      // This prevents the redirect to /video/[uid] for seated events
      expect(result.current.instantVideoMeetingUrl).toBeUndefined();
    });
  });

  it("should set instantVideoMeetingUrl when query returns data AND isInstantMeeting is true", async () => {
    vi.mocked(getQueryParam).mockReturnValue("test-booking-uid");

    const mockBookingData = {
      booking: {
        uid: "test-booking-uid",
        metadata: {
          videoCallUrl: "http://localhost:3000/video/test-booking-uid",
        },
      },
    };

    const mockUseQueryFn = getMockUseQuery();
    mockUseQueryFn.mockReturnValue({
      data: mockBookingData,
      isPending: false,
    });

    mockBookingMetadataSchema.parse.mockReturnValue({
      videoCallUrl: "http://localhost:3000/video/test-booking-uid",
    });

    const mockStore = createMockStore(true);

    const { result } = renderHook(
      () => useBookings({ event: mockEvent, bookingForm: {} as any, metadata: {} }),
      {
        wrapper: createTestWrapper(mockStore),
      }
    );

    await waitFor(() => {
      // instantVideoMeetingUrl should be set when isInstantMeeting is true
      expect(result.current.instantVideoMeetingUrl).toBe("http://localhost:3000/video/test-booking-uid");
    });
  });
});
