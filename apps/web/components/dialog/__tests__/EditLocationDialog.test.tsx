import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import { vi } from "vitest";

import LocationSelect from "@calcom/features/form/components/LocationSelect";

import { QueryCell } from "../../../lib/QueryCell";
import { EditLocationDialog } from "../EditLocationDialog";

// // Mock the trpc hook
vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      apps: {
        locationOptions: {
          useQuery: vi.fn(),
        },
      },
    },
  },
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useRouter: vi.fn(() => ({
      push: vi.fn(() => {
        return;
      }),
    })),
  };
});

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../lib/QueryCell", () => ({
  QueryCell: vi.fn(),
}));

vi.mock("@calcom/features/form/components/LocationSelect", () => {
  return {
    default: vi.fn(),
  };
});

const AttendeePhoneNumberLabel = "Attendee phone number";
const OrganizerPhoneLabel = "Organizer phone number";
const CampfireLabel = "Campfire";
const ZoomVideoLabel = "Zoom Video";
const OrganizerDefaultConferencingAppLabel = "Organizer's default app";

describe("EditLocationDialog", () => {
  const mockProps = {
    saveLocation: vi.fn(),
    setShowLocationModal: vi.fn(),
    isOpenDialog: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    QueryCell.mockImplementation(({ success }) => {
      return success({
        data: [
          {
            label: "Conferencing",
            options: [
              {
                value: "integrations:campfire_video",
                label: CampfireLabel,
                disabled: false,
                icon: "/app-store/campfire/icon.svg",
                slug: "campfire",
                credentialId: 2,
                teamName: null,
              },
              {
                value: "integrations:daily",
                label: "Cal Video (Default)",
                disabled: false,
                icon: "/app-store/dailyvideo/icon.svg",
                slug: "daily-video",
                credentialId: 0,
                teamName: "Global",
              },
              {
                value: "integrations:zoom",
                label: ZoomVideoLabel,
                disabled: false,
                icon: "/app-store/zoomvideo/icon.svg",
                slug: "zoom",
                credentialId: 1,
                teamName: null,
              },
              {
                label: "Organizer's default app",
                value: "conferencing",
                icon: "/link.svg",
              },
            ],
          },
          {
            label: "in person",
            options: [
              {
                label: "In Person (Attendee Address)",
                value: "attendeeInPerson",
                icon: "/map-pin-dark.svg",
              },
              {
                label: "In Person (Organizer Address)",
                value: "inPerson",
                icon: "/map-pin-dark.svg",
              },
            ],
          },
          {
            label: "Other",
            options: [
              {
                label: "Custom attendee location",
                value: "somewhereElse",
                icon: "/message-pin.svg",
              },
              {
                label: "Link meeting",
                value: "link",
                icon: "/link.svg",
              },
            ],
          },
          {
            label: "phone",
            options: [
              {
                label: AttendeePhoneNumberLabel,
                value: "phone",
                icon: "/phone.svg",
              },
              {
                label: OrganizerPhoneLabel,
                value: "userPhone",
                icon: "/phone.svg",
              },
            ],
          },
        ],
      });
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    LocationSelect.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ options, defaultValue, onChange }: { options: any; defaultValue: any; onChange: any }) => {
        return (
          <select
            data-testid="location-select"
            defaultValue={defaultValue}
            onChange={(e) => {
              const selectedOption = options
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .flatMap((opt: any) => opt.options || [opt])
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .find((opt: any) => opt.value === e.target.value);
              onChange(selectedOption);
            }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {options.map((group: any) => (
              <optgroup key={group.value} label={group.label}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(group.options || [group]).map((option: any) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        );
      }
    );
  });

  it("renders the dialog when open", () => {
    // It shows whatever the location even if it isn't in the options list
    render(<EditLocationDialog {...mockProps} booking={{ location: "Office" }} />);
    expect(screen.getByText("edit_location")).toBeInTheDocument();
    expect(screen.getByText("current_location:")).toBeInTheDocument();
    expect(screen.getByText("Office")).toBeInTheDocument();
  });

  it("closes the dialog when cancel is clicked", async () => {
    render(<EditLocationDialog {...mockProps} booking={{ location: "Office" }} />);
    fireEvent.click(screen.getByText("cancel"));
    expect(mockProps.setShowLocationModal).toHaveBeenCalledWith(false);
  });

  describe("Team Booking Case", () => {
    it("should not show Attendee Phone Number but show Organizer Phone Number and dynamic link Conferencing apps", async () => {
      render(<EditLocationDialog {...mockProps} booking={{ location: "Office" }} teamId={1} />);

      expect(screen.queryByText(AttendeePhoneNumberLabel)).not.toBeInTheDocument();
      expect(screen.queryByText(OrganizerPhoneLabel)).toBeInTheDocument();
      expect(screen.queryByText(CampfireLabel)).toBeInTheDocument();
      expect(screen.queryByText(ZoomVideoLabel)).toBeInTheDocument();
    });

    it("should update location to Organizer Default App", async () => {
      render(<EditLocationDialog {...mockProps} booking={{ location: "Office" }} teamId={1} />);

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "conferencing" } });
      // Submit the form
      fireEvent.click(screen.getByText("update"));

      await waitFor(() => {
        expect(mockProps.saveLocation).toHaveBeenCalledWith({
          newLocation: "conferencing",
          credentialId: null,
        });
        expect(mockProps.setShowLocationModal).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("Non Team Booking Case", () => {
    it("should not show Organizer's default app", async () => {
      render(<EditLocationDialog {...mockProps} booking={{ location: "Office" }} />);

      expect(screen.queryByText(OrganizerDefaultConferencingAppLabel)).not.toBeInTheDocument();
    });
  });
});
