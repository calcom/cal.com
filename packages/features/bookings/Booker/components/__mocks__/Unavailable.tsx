vi.mock("../components/Unavailable", () => ({
  NotFound: () => <div data-testid="not-found">Mock Not Found</div>,
}));
