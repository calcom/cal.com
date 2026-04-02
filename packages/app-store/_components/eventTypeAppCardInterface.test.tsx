import { render, screen } from "@testing-library/react";
import type { AppCardApp } from "types";
import { vi } from "vitest";
import { DynamicComponent } from "./DynamicComponent";
import { EventTypeAppCard } from "./EventTypeAppCardInterface";

vi.mock("./DynamicComponent", async () => {
  const actual = (await vi.importActual("./DynamicComponent")) as object;
  return {
    ...actual,
    DynamicComponent: vi.fn(() => <div>MockedDynamicComponent</div>),
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

const getAppDataMock = vi.fn();
const setAppDataMock = vi.fn();
const mockProps = {
  app: {
    name: "TestApp",
    slug: "testapp",
    credentialOwner: {},
  } as AppCardApp,
  eventType: {},
  getAppData: getAppDataMock,
  setAppData: setAppDataMock,
  LockedIcon: <div>MockedIcon</div>,
  disabled: false,
  onAppInstallSuccess: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe("Tests for EventTypeAppCard component", () => {
  test("Should render DynamicComponent with correct slug", () => {
    render(<EventTypeAppCard {...mockProps} />);

    expect(DynamicComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: mockProps.app.slug,
      }),
      {}
    );

    expect(screen.getByText("MockedDynamicComponent")).toBeInTheDocument();
  });

  test("Should invoke getAppData and setAppData from context on render", () => {
    render(
      <EventTypeAppCard
        {...mockProps}
        value={{
          getAppData: getAppDataMock(),
          setAppData: setAppDataMock(),
        }}
      />
    );

    expect(getAppDataMock).toHaveBeenCalled();
    expect(setAppDataMock).toHaveBeenCalled();
  });

  test("Should render DynamicComponent with 'stripepayment' slug for stripe app", () => {
    const stripeProps = {
      ...mockProps,
      app: {
        ...mockProps.app,
        slug: "stripe",
      },
    };

    render(<EventTypeAppCard {...stripeProps} />);

    expect(DynamicComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "stripepayment",
      }),
      {}
    );

    expect(screen.getByText("MockedDynamicComponent")).toBeInTheDocument();
  });

  test("Should display error boundary message on child component error", () => {
    (DynamicComponent as jest.Mock).mockImplementation(() => {
      return Error("Mocked error from DynamicComponent");
    });

    render(<EventTypeAppCard {...mockProps} />);
    const errorMessage = screen.getByText(`There is some problem with ${mockProps.app.name} App`);
    expect(errorMessage).toBeInTheDocument();
  });
});
