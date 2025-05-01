vi.mock("../config", () => ({
  useBookerResizeAnimation: () => ({ current: document.createElement("div") }),
  getBookerSizeClassNames: () => [],
  fadeInLeft: {},
}));
