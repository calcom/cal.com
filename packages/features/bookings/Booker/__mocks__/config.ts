import { BookerLayouts } from "@calcom/prisma/zod-utils";

vi.mock("../config", () => ({
  useBookerResizeAnimation: () => ({ current: document.createElement("div") }),
  getBookerSizeClassNames: () => [],
  fadeInLeft: {},
  extraDaysConfig: {
    mobile: {
      desktop: 0,
      tablet: 0,
    },
    [BookerLayouts.MONTH_VIEW]: {
      desktop: 0,
      tablet: 0,
    },
    [BookerLayouts.WEEK_VIEW]: {
      desktop: 7,
      tablet: 4,
    },
    [BookerLayouts.COLUMN_VIEW]: {
      desktop: 6,
      tablet: 2,
    },
  },
}));
