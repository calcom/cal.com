vi.mock("../config", () => ({
  useBookerResizeAnimation: () => ({ current: document.createElement("div") }),
  getBookerSizeClassNames: () => [],
  fadeInLeft: {},
  extraDaysConfig: {
    mobile: {desktop: 0, tablet: 0},
    month_view: {desktop: 0, tablet: 0},
    week_view: {desktop: 7, tablet: 4},
    column_view: {desktop: 6, tablet: 2},
  }
}));
