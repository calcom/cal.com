import React from "react";
import { vi } from "vitest";

global.React = React;
vi.mock("next-auth/react", () => ({
  useSession: vi.fn().mockReturnValue({ data: { user: { id: "user-id" } } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({
    replace: vi.fn(),
  }),
  usePathname: vi.fn().mockReturnValue("/success"),
}));

vi.mock("@calcom/app-store/BookingPageTagManager", () => ({
  default: vi.fn(),
}));

vi.mock("@calcom/app-store/locations", () => ({
  DailyLocationType: "daily",
  guessEventLocationType: vi.fn(),
  getSuccessPageLocationMessage: vi.fn().mockReturnValue(""),
}));

vi.mock("@calcom/app-store/utils", () => ({
  getEventTypeAppData: vi.fn().mockReturnValue({}),
}));

vi.mock("@calcom/core/event", () => ({
  getEventName: vi.fn().mockReturnValue("event-name"),
}));

vi.mock("@calcom/ee/organizations/lib/orgDomains", () => ({
  getOrgFullOrigin: vi.fn(),
}));

vi.mock("@calcom/features/eventtypes/components", () => ({
  EventTypeDescriptionLazy: vi.fn(),
}));

vi.mock("@calcom/embed-core/embed-iframe", () => {
  return {
    useIsBackgroundTransparent: vi.fn().mockReturnValue(false),
    useIsEmbed: vi.fn().mockReturnValue(false),
    useEmbedNonStylesConfig: vi.fn().mockReturnValue({}),
    useEmbedStyles: vi.fn().mockReturnValue({}),
  };
});

vi.mock("@calcom/features/bookings/components/event-meta/Price", () => {
  return {};
});

vi.mock("@calcom/features/bookings/lib/SystemField", () => {
  return {};
});

vi.mock("@calcom/lib/constants", () => {
  return {
    DEFAULT_LIGHT_BRAND_COLOR: "DEFAULT_LIGHT_BRAND_COLOR",
    DEFAULT_DARK_BRAND_COLOR: "DEFAULT_DARK_BRAND_COLOR",
    BOOKER_NUMBER_OF_DAYS_TO_LOAD: 1,
  };
});

vi.mock("@calcom/lib/date-fns", () => {
  return {};
});

vi.mock("@calcom/lib/getBrandColours", () => {
  return {
    default: vi.fn(),
  };
});

vi.mock("@calcom/lib/hooks/useCompatSearchParams", () => {
  return {
    useCompatSearchParams: vi.fn().mockReturnValue({}),
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
    useRouterQuery: vi.fn().mockReturnValue({
      uid: "uid",
    }),
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

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      public: {
        submitRating: {
          useMutation: vi.fn(),
        },
        noShow: {
          useMutation: vi.fn(),
        },
      },
    },
  },
}));

vi.mock("@calcom/ui", () => ({
  HeadSeo: vi.fn(),
  useCalcomTheme: vi.fn(),
  Icon: vi.fn(),
  UnpublishedEntity: vi.fn(),
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
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn().mockReturnValue(null),
  },
}));

vi.mock("@calcom/lib/timeFormat", () => ({
  detectBrowserTimeFormat: vi.fn(),
  isBrowserLocale24h: vi.fn(),
  getIs24hClockFromLocalStorage: vi.fn(),
}));
