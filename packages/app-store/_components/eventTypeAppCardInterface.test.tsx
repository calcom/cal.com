import { render, screen } from "@testing-library/react";
import type { CredentialOwner } from "types";
import { vi } from "vitest";

import type { RouterOutputs } from "@calcom/trpc";

import AsyncDynamicComponent from "./AsyncDynamicComponent";
import { EventTypeAppCard } from "./EventTypeAppCardInterface";

// Mock AsyncDynamicComponent
vi.mock("./AsyncDynamicComponent", () => ({
  default: vi.fn(() => <div>MockedAsyncDynamicComponent</div>),
}));

const MockedAsyncDynamicComponent = vi.mocked(AsyncDynamicComponent);

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
  } as RouterOutputs["viewer"]["apps"]["integrations"]["items"][number] & {
    credentialOwner?: CredentialOwner;
  },
  eventType: {},
  getAppData: getAppDataMock,
  setAppData: setAppDataMock,
  LockedIcon: <div>MockedIcon</div>,
  disabled: false,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe("Tests for EventTypeAppCard component", () => {
  test("Should render AsyncDynamicComponent with correct slug", () => {
    render(<EventTypeAppCard {...mockProps} />);

    expect(MockedAsyncDynamicComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: mockProps.app.slug,
      }),
      {}
    );

    expect(screen.getByText("MockedAsyncDynamicComponent")).toBeInTheDocument();
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

  test("Should render AsyncDynamicComponent with 'stripepayment' slug for stripe app", () => {
    const stripeProps = {
      ...mockProps,
      app: {
        ...mockProps.app,
        slug: "stripe",
      },
    };

    render(<EventTypeAppCard {...stripeProps} />);

    expect(MockedAsyncDynamicComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "stripepayment",
      }),
      {}
    );

    expect(screen.getByText("MockedAsyncDynamicComponent")).toBeInTheDocument();
  });

  test("Should display error boundary message on child component error", () => {
    MockedAsyncDynamicComponent.mockImplementation(() => {
      throw new Error("Mocked error from AsyncDynamicComponent");
    });

    render(<EventTypeAppCard {...mockProps} />);
    const errorMessage = screen.getByText(`There is some problem with ${mockProps.app.name} App`);
    expect(errorMessage).toBeInTheDocument();
  });
});
