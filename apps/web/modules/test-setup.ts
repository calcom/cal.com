import React from "react";
import { vi, afterEach } from "vitest";

global.React = React;

afterEach(() => {
  vi.resetAllMocks();
});

// Mock all modules that are used in multiple tests for modules
// We don't intend to provide the mock implementation here. They should be provided by respective tests.
// But it makes it super easy to start testing any module view without worrying about mocking the dependencies.
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({
    replace: vi.fn(),
  }),
  usePathname: vi.fn().mockReturnValue("/settings/billing"),
}));

vi.mock("@calcom/app-store/BookingPageTagManager", () => ({
  default: vi.fn(),
}));

vi.mock("@calcom/app-store/locations", () => ({
  DailyLocationType: "daily",
  guessEventLocationType: vi.fn(),
  getSuccessPageLocationMessage: vi.fn(),
}));

vi.mock("@calcom/app-store/utils", () => ({
  getEventTypeAppData: vi.fn(),
}));

vi.mock("@calcom/features/eventtypes/lib/eventNaming", () => ({
  getEventName: vi.fn(),
}));

vi.mock("@calcom/ee/organizations/lib/orgDomains", () => ({
  getOrgFullOrigin: vi.fn(),
}));

vi.mock("@calcom/features/eventtypes/components", () => ({
  EventTypeDescriptionLazy: vi.fn(),
}));

vi.mock("@calcom/embed-core/embed-iframe", () => {
  return {
    useIsBackgroundTransparent: vi.fn(),
    useIsEmbed: vi.fn(),
    useEmbedNonStylesConfig: vi.fn(),
    useEmbedStyles: vi.fn(),
  };
});

vi.mock("@calcom/features/bookings/components/event-meta/Price", () => {
  return {};
});

vi.mock("@calcom/lib/bookings/SystemField", () => {
  return {};
});

vi.mock("@calcom/lib/constants", () => {
  return {
    DEFAULT_LIGHT_BRAND_COLOR: "DEFAULT_LIGHT_BRAND_COLOR",
    DEFAULT_DARK_BRAND_COLOR: "DEFAULT_DARK_BRAND_COLOR",
    BOOKER_NUMBER_OF_DAYS_TO_LOAD: 1,
  };
});

vi.mock("@calcom/lib/dayjs", () => {
  return {};
});

vi.mock("@calcom/lib/getBrandColours", () => {
  return {
    default: vi.fn(),
  };
});

vi.mock("@calcom/lib/hooks/useCompatSearchParams", () => {
  return {
    useCompatSearchParams: vi.fn(),
  };
});

vi.mock("@calcom/lib/hooks/useLocale", () => {
  return {
    useLocale: vi.fn().mockReturnValue({
      t: vi.fn().mockImplementation((text: string) => {
        return text;
      }),
      i18n: {
        language: "en",
      },
    }),
  };
});

vi.mock("@calcom/lib/hooks/useRouterQuery", () => {
  return {
    useRouterQuery: vi.fn(),
  };
});

vi.mock("@calcom/lib/hooks/useTheme", () => {
  return {
    default: vi.fn(),
  };
});

vi.mock("@calcom/lib/recurringStrings", () => {
  return {};
});

vi.mock("@calcom/lib/recurringStrings", () => {
  return {};
});

vi.mock("@calcom/prisma/zod-utils", () => ({
  BookerLayouts: {
    MONTH_VIEW: "month",
  },
  EventTypeMetaDataSchema: {
    parse: vi.fn(),
  },
  bookingMetadataSchema: {
    parse: vi.fn(),
  },
}));

vi.mock("@calcom/app-store/zod-utils", () => ({
  eventTypeMetaDataSchemaWithTypedApps: {
    parse: vi.fn(),
  },
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      public: {
        submitRating: {
          useMutation: vi.fn(),
        },
        markHostAsNoShow: {
          useMutation: vi.fn(),
        },
      },
    },
  },
}));

vi.mock("@calcom/ui/styles", () => ({
  useCalcomTheme: vi.fn(),
}));

vi.mock("@calcom/ui/components/icon", () => ({
  Icon: vi.fn(),
}));

vi.mock("@calcom/ui/components/unpublished-entity", () => ({
  UnpublishedEntity: vi.fn(),
}));

vi.mock("@calcom/ui/components/avatar", () => ({
  UserAvatar: vi.fn(),
}));

vi.mock("@calcom/web/components/PageWrapper", () => ({
  default: vi.fn(),
}));

vi.mock("@calcom/web/components/booking/CancelBooking", () => ({}));

vi.mock("@calcom/web/components/schemas/EventReservationSchema", () => ({
  default: vi.fn(),
}));

vi.mock("@calcom/web/lib/clock", () => ({
  timeZone: vi.fn(),
}));

vi.mock("./bookings-single-view.getServerSideProps", () => ({}));

vi.mock("@calcom/lib/webstorage", () => ({
  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

vi.mock("@calcom/lib/timeFormat", () => ({
  detectBrowserTimeFormat: vi.fn(),
  isBrowserLocale24h: vi.fn(),
  getIs24hClockFromLocalStorage: vi.fn(),
}));
