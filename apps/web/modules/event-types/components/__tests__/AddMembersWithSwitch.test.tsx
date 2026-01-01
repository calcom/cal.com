import { render, screen, fireEvent, act } from "@testing-library/react";
import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import type { Host, TeamMember } from "@calcom/features/eventtypes/lib/types";
import type { AddMembersWithSwitchProps } from "../AddMembersWithSwitch";
import { AddMembersWithSwitch } from "../AddMembersWithSwitch";

// Mock matchMedia
vi.mock("@formkit/auto-animate/react", () => ({
  useAutoAnimate: () => [null],
}));

// Mock Segment component
vi.mock("@calcom/features/Segment", () => ({
  Segment: vi.fn().mockImplementation(({ onQueryValueChange }) => (
    <div data-testid="mock-segment">
      <button onClick={() => onQueryValueChange({ queryValue: { id: "test" } })}>Update Query</button>
    </div>
  )),
}));

const mockTeamMembers: TeamMember[] = [
  {
    value: "1",
    label: "John Doe",
    avatar: "avatar1.jpg",
    email: "john@example.com",
    defaultScheduleId: 1,
  },
  {
    value: "2",
    label: "Jane Smith",
    avatar: "avatar2.jpg",
    email: "jane@example.com",
    defaultScheduleId: 2,
  },
];

// Mock trpc
vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    useUtils: () => ({
      viewer: {
        appRoutingForms: {
          getAttributesForTeam: {
            prefetch: vi.fn(),
          },
        },
      },
    }),
  },
}));

// Mock useIsPlatform to return false (web context) so Segment component renders
vi.mock("@calcom/atoms/hooks/useIsPlatform", () => ({
  useIsPlatform: () => false,
}));

const defaultFormValues = {
  assignRRMembersUsingSegment: false,
  rrSegmentQueryValue: null,
  hosts: [],
};

const renderComponent = ({
  componentProps,
  formDefaultValues = defaultFormValues,
}: {
  componentProps: AddMembersWithSwitchProps;
  formDefaultValues?: typeof defaultFormValues;
}) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const methods = useForm({
      defaultValues: formDefaultValues,
    });
    const [assignAllTeamMembers, setAssignAllTeamMembers] = React.useState(
      componentProps.assignAllTeamMembers
    );
    return (
      <FormProvider {...methods}>
        {React.cloneElement(children as React.ReactElement, {
          assignAllTeamMembers,
          setAssignAllTeamMembers,
        })}
      </FormProvider>
    );
  };

  return render(<AddMembersWithSwitch {...componentProps} />, { wrapper: Wrapper });
};

describe("AddMembersWithSwitch", () => {
  const defaultProps = {
    teamMembers: mockTeamMembers,
    value: [] as Host[],
    onChange: vi.fn(),
    onActive: vi.fn(),
    isFixed: false,
    teamId: 1,
    assignAllTeamMembers: false,
    setAssignAllTeamMembers: vi.fn(),
    automaticAddAllEnabled: false,
    groupId: null,
  };

  it("should render in TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_NOT_APPLICABLE state", () => {
    renderComponent({
      componentProps: {
        ...defaultProps,
        assignAllTeamMembers: false,
        setAssignAllTeamMembers: vi.fn(),
        isSegmentApplicable: false,
        automaticAddAllEnabled: false,
        groupId: null,
      },
    });
    expect(screen.queryByTestId("assign-all-team-members-toggle")).not.toBeInTheDocument();
    expectManualHostListToBeThere();
  });

  it("should render in TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_APPLICABLE state", () => {
    renderComponent({
      componentProps: {
        ...defaultProps,
        assignAllTeamMembers: false,
        setAssignAllTeamMembers: vi.fn(),
        isSegmentApplicable: false,
        automaticAddAllEnabled: true,
        groupId: null,
      },
    });

    expect(screen.getByTestId("assign-all-team-members-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("assign-all-team-members-toggle").getAttribute("aria-checked")).toBe("false");
    expectManualHostListToBeThere();
  });

  it("should render in ALL_TEAM_MEMBERS_ENABLED_AND_SEGMENT_NOT_APPLICABLE state", () => {
    renderComponent({
      componentProps: {
        ...defaultProps,
        assignAllTeamMembers: true,
        setAssignAllTeamMembers: vi.fn(),
        isSegmentApplicable: false,
        automaticAddAllEnabled: true,
        groupId: null,
      },
      formDefaultValues: {
        assignRRMembersUsingSegment: true,
        rrSegmentQueryValue: null,
        hosts: [],
      },
    });

    // In ALL_TEAM_MEMBERS_ENABLED_AND_SEGMENT_NOT_APPLICABLE state:
    // - AssignAllTeamMembers toggle IS rendered (when groupId is null)
    // - Segment toggle is NOT rendered (because isSegmentApplicable is false)
    expect(screen.getByTestId("assign-all-team-members-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("assign-all-team-members-toggle").getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByTestId("segment-toggle")).not.toBeInTheDocument();
  });

  it("should render segment toggle in enabled state when isSegmentApplicable is true and assignRRMembersUsingSegment is also true(even if assignAllTeamMembers is false)", () => {
    renderComponent({
      componentProps: {
        ...defaultProps,
        assignAllTeamMembers: false,
        setAssignAllTeamMembers: vi.fn(),
        isSegmentApplicable: true,
        automaticAddAllEnabled: true,
        groupId: null,
      },
      formDefaultValues: {
        assignRRMembersUsingSegment: true,
        rrSegmentQueryValue: null,
        hosts: [],
      },
    });

    expect(screen.getByTestId("segment-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("segment-toggle").getAttribute("aria-checked")).toBe("true");
  });

  it("should call onChange when team members are selected", () => {
    renderComponent({ componentProps: defaultProps });

    const combobox = screen.getByRole("combobox");
    fireEvent.focus(combobox);
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    fireEvent.click(screen.getByText("John Doe"));

    expect(defaultProps.onChange).toHaveBeenCalled();
  });

  it("should show segment toggle when 'Automatically add all team members' is toggled on and segment toggle can be enabled", () => {
    renderComponent({
      componentProps: {
        ...defaultProps,
        assignAllTeamMembers: false,
        setAssignAllTeamMembers: vi.fn(),
        isSegmentApplicable: true,
        automaticAddAllEnabled: true,
        groupId: null,
      },
      formDefaultValues: {
        assignRRMembersUsingSegment: false,
        rrSegmentQueryValue: null,
        hosts: [],
      },
    });

    // Initially, segment toggle should not be visible because assignAllTeamMembers is false
    expect(screen.queryByTestId("segment-toggle")).not.toBeInTheDocument();

    // Click to enable "Automatically add all team members"
    act(() => {
      screen.getByTestId("assign-all-team-members-toggle").click();
    });

    // Now segment toggle should be visible
    expect(screen.getByTestId("segment-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("segment-toggle").getAttribute("aria-checked")).toBe("false");

    // Click segment toggle to enable it
    act(() => {
      screen.getByTestId("segment-toggle").click();
    });

    // Segment toggle should now be checked
    expect(screen.getByTestId("segment-toggle").getAttribute("aria-checked")).toBe("true");
  });
});

function expectManualHostListToBeThere() {
  expect(screen.getByRole("combobox")).toBeInTheDocument();
}
