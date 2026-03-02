import type { LocationFormValues } from "@calcom/features/eventtypes/lib/types";
import { render, screen } from "@testing-library/react";
import type * as React from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

// Mock posthog-js
vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

// Mock auto-animate
vi.mock("@formkit/auto-animate/react", () => ({
  useAutoAnimate: () => [null],
}));

// Mock useIsPlatform
vi.mock("@calcom/atoms/hooks/useIsPlatform", () => ({
  useIsPlatform: () => false,
}));

// Mock LocationSelect
vi.mock("@calcom/features/form/components/LocationSelect", () => ({
  default: vi.fn(() => <div data-testid="mock-location-select" />),
}));

// Mock ServerTrans to render children with translation key visible
vi.mock("@calcom/lib/components/ServerTrans", () => ({
  default: ({
    i18nKey,
    components,
  }: {
    i18nKey: string;
    t: (key: string) => string;
    components: React.ReactNode[];
  }) => (
    <span data-testid={`server-trans-${i18nKey}`}>
      {i18nKey === "cant_find_the_right_conferencing_app_visit_our_app_store" && (
        <>
          {"Can't find the right conferencing app? Visit our "}
          {components[0]}
          {"."}
        </>
      )}
      {i18nKey === "need_help_setting_up_team_event_locations" && (
        <>
          {"Need help setting up your team event locations? "}
          {components[0]}
        </>
      )}
    </span>
  ),
}));

// Mock useLocale
vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

// Mock CalVideoSettings
vi.mock("../CalVideoSettings", () => ({
  default: () => null,
}));

// Mock DefaultLocationSettings
vi.mock("../DefaultLocationSettings", () => ({
  default: () => null,
}));

// Mock LocationInput
vi.mock("../LocationInput", () => ({
  default: () => null,
}));

import type { TDestinationCalendar, TEventTypeLocation, TLocationOptions } from "../Locations";
import Locations from "../Locations";

type LocationsWrapperProps = {
  team: { id: number } | null;
  showAppStoreLink: boolean;
  destinationCalendar?: TDestinationCalendar;
  eventType?: TEventTypeLocation;
  locationOptions?: TLocationOptions;
};

const LocationsWrapper = ({
  team,
  showAppStoreLink,
  destinationCalendar = null,
  eventType = { locations: [], calVideoSettings: undefined },
  locationOptions = [],
}: LocationsWrapperProps) => {
  const { getValues, setValue, control, formState } = useForm<LocationFormValues>({
    defaultValues: {
      locations: [],
    },
  });

  return (
    <Locations
      team={team}
      destinationCalendar={destinationCalendar}
      showAppStoreLink={showAppStoreLink}
      getValues={getValues}
      setValue={setValue}
      control={control}
      formState={formState}
      eventType={eventType}
      locationOptions={locationOptions}
    />
  );
};

describe("Locations - App Store and Support Docs Links", () => {
  it("renders the App Store link when showAppStoreLink is true", () => {
    render(<LocationsWrapper team={null} showAppStoreLink={true} />);

    expect(
      screen.getByTestId("server-trans-cant_find_the_right_conferencing_app_visit_our_app_store")
    ).toBeInTheDocument();
    expect(screen.getByText("App Store")).toBeInTheDocument();
  });

  it("does not render the App Store link when showAppStoreLink is false", () => {
    render(<LocationsWrapper team={null} showAppStoreLink={false} />);

    expect(
      screen.queryByTestId("server-trans-cant_find_the_right_conferencing_app_visit_our_app_store")
    ).not.toBeInTheDocument();
  });

  it("renders the support docs link when team is provided", () => {
    render(<LocationsWrapper team={{ id: 1 }} showAppStoreLink={false} />);

    expect(screen.getByTestId("server-trans-need_help_setting_up_team_event_locations")).toBeInTheDocument();
    const supportLink = screen.getByText("See support docs");
    expect(supportLink).toBeInTheDocument();
    expect(supportLink).toHaveAttribute(
      "href",
      "https://cal.com/help/event-types/setup-location#setting-up-location-of-team-events-on-cal-com"
    );
    expect(supportLink).toHaveAttribute("target", "_blank");
    expect(supportLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not render the support docs link when team is null", () => {
    render(<LocationsWrapper team={null} showAppStoreLink={false} />);

    expect(
      screen.queryByTestId("server-trans-need_help_setting_up_team_event_locations")
    ).not.toBeInTheDocument();
  });

  it("renders both links when showAppStoreLink is true and team is provided", () => {
    render(<LocationsWrapper team={{ id: 1 }} showAppStoreLink={true} />);

    expect(
      screen.getByTestId("server-trans-cant_find_the_right_conferencing_app_visit_our_app_store")
    ).toBeInTheDocument();
    expect(screen.getByTestId("server-trans-need_help_setting_up_team_event_locations")).toBeInTheDocument();
  });

  it("App Store link points to the correct URL", () => {
    render(<LocationsWrapper team={null} showAppStoreLink={true} />);

    const appStoreLink = screen.getByText("App Store");
    expect(appStoreLink).toHaveAttribute("href", "/apps/categories/conferencing");
    expect(appStoreLink.tagName).toBe("A");
  });

  it("support docs link points to the correct URL and opens in new tab", () => {
    render(<LocationsWrapper team={{ id: 1 }} showAppStoreLink={false} />);

    const supportLink = screen.getByText("See support docs");
    expect(supportLink.tagName).toBe("A");
    expect(supportLink).toHaveAttribute(
      "href",
      "https://cal.com/help/event-types/setup-location#setting-up-location-of-team-events-on-cal-com"
    );
    expect(supportLink).toHaveAttribute("target", "_blank");
  });
});
