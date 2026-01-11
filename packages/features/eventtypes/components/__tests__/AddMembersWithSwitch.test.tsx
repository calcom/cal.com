import { render, screen, fireEvent, act } from "@testing-library/react";
import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import type { Host, TeamMember } from "../../lib/types";
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
vi.mock("@calcom/trpc", () => ({
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

const renderComponent = ({
  componentProps,
  formDefaultValues = {
    assignRRMembersUsingSegment: false,
    rrSegmentQueryValue: null,
    hosts: [],
  },
}: {
  componentProps: AddMembersWithSwitchProps;
  formDefaultValues?: Record<string, unknown>;
}) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const methods = useForm({
      defaultValues: formDefaultValues,
    });
    const [assignAllTeamMembers, setAssignAllTeamMembers] = React.useState(false);
    console.log(methods.getValues());
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
  };

  it("should render in TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_NOT_APPLICABLE state", () => {
    renderComponent({
      componentProps: {
        ...defaultProps,
        assignAllTeamMembers: false,
        isSegmentApplicable: false,
        automaticAddAllEnabled: false,
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
        isSegmentApplicable: false,
        automaticAddAllEnabled: true,
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
        isSegmentApplicable: false,
      },
      formDefaultValues: {
        assignRRMembersUsingSegment: true,
        rrSegmentQueryValue: null,
        hosts: [],
      },
    });

    expect(screen.queryByTestId("assign-all-team-members-toggle")).not.toBeInTheDocument();
    expect(screen.queryByText("filter_by_attributes")).not.toBeInTheDocument();
  });

  it("should render segment toggle in enabled state when isSegmentApplicable is true and assignRRMembersUsingSegment is also true(even if assignAllTeamMembers is false)", () => {
    renderComponent({
      componentProps: {
        ...defaultProps,
        assignAllTeamMembers: false,
        isSegmentApplicable: true,
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

  it("should show Segment when 'Automatically add all team members' is toggled on and then segment toggle is switched on", () => {
    renderComponent({
      componentProps: {
        ...defaultProps,
        assignAllTeamMembers: true,
        isSegmentApplicable: true,
        automaticAddAllEnabled: true,
      },
      formDefaultValues: {
        assignRRMembersUsingSegment: false,
        rrSegmentQueryValue: null,
        hosts: [],
      },
    });

    expect(screen.queryByTestId("segment-toggle")).not.toBeInTheDocument();

    act(() => {
      screen.getByTestId("assign-all-team-members-toggle").click();
    });

    expect(screen.queryByTestId("mock-segment")).not.toBeInTheDocument();

    act(() => {
      screen.getByTestId("segment-toggle").click();
    });

    expect(screen.getByTestId("mock-segment")).toBeInTheDocument();
  });
});

function expectManualHostListToBeThere() {
  expect(screen.getByRole("combobox")).toBeInTheDocument();
}
